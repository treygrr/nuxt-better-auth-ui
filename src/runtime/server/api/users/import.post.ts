import { defineEventHandler, getRequestHeaders, useRuntimeConfig } from '#imports';
import * as z from 'zod';

import { requireAdminPermission } from '../../utils/admin';
import { readJsonBody } from '../../utils/input';

/** At most this many rows per import. */
const MAX_ROWS = 1000;
/** Rows created at once: each hashes a password, which is slow on purpose. */
const CONCURRENCY = 8;

type AdditionalField = {
    type: string | string[];
    required?: boolean;
    input?: boolean;
    returned?: boolean;
    defaultValue?: unknown;
};
type ApiError = { body?: { code?: string; message?: string }; message?: string };
type ImportAuth = {
    api: {
        createUser(input: {
            body: { email: string; name: string; password?: string; role?: string[]; data?: Record<string, unknown> };
            headers: Headers;
        }): Promise<{ user: { id: string } }>;
        requestPasswordReset(input: { body: { email: string; redirectTo?: string } }): Promise<unknown>;
    };
};

/** A row's outcome: created, skipped (already there) or failed (with why). */
type Outcome = { row: number; email: string; code?: string; message?: string };

const Body = z.object({
    rows: z
        .array(
            z.object({
                // The CSV's line number, for the results.
                row: z.number().int().optional(),
                // Each column's text. Fields are checked row by row, so one bad row doesn't stop the rest.
                values: z.record(
                    z.string(),
                    z
                        .union([z.string(), z.number(), z.boolean(), z.null()])
                        .transform((value) => (value === null ? '' : String(value)))
                )
            })
        )
        .min(1)
        .max(MAX_ROWS),
    sendPasswordLinks: z.boolean().default(false)
});
type Row = z.output<typeof Body>['rows'][number];

const truthy = (value: string) => /^(true|1|yes|y)$/i.test(value.trim());
const failure = (code: string, message: string) => ({ code, message });

/**
 * Creates users from CSV rows, for staff who can create users (`user: create`), through Better Auth's own admin
 * createUser with the staff member's session: Better Auth checks the permission (and `set-role` for roles), and the
 * audit log records each user. createUser stores what it's given as it is, so each row is checked here first: a valid
 * email, a password within the app's rules, a known role, a username Better Auth's Username plugin would accept, and
 * the app's own fields (`user.additionalFields`) in their types. Existing emails are skipped, not updated. Without a
 * password, people can be emailed a link to set one (with reset emails set up).
 */
export default defineEventHandler(async (event) => {
    const { context, auth } = await requireAdminPermission(event, { user: ['create'] });
    const body = await readJsonBody(event, Body, {
        default: { code: 'IMPORT_ROWS_INVALID', message: `Import between 1 and ${MAX_ROWS} users at a time` }
    });
    const { rows } = body;

    const options = context.options as {
        user?: { additionalFields?: Record<string, AdditionalField> };
        emailAndPassword?: { minPasswordLength?: number; maxPasswordLength?: number; sendResetPassword?: unknown };
    };
    const minPassword = options.emailAndPassword?.minPasswordLength ?? 8;
    const maxPassword = options.emailAndPassword?.maxPasswordLength ?? 128;
    const usernamePlugin = context.getPlugin('username') as {
        options?: { minUsernameLength?: number; maxUsernameLength?: number };
    } | null;
    const fields = Object.entries(options.user?.additionalFields ?? {}).filter(
        ([, field]) => field.input !== false && field.returned !== false
    );
    const config = useRuntimeConfig(event).public.betterAuthUi as { pages: { resetPassword: string | false } };
    const canSendLinks =
        typeof options.emailAndPassword?.sendResetPassword === 'function' && !!config.pages.resetPassword;
    const sendLinks = body.sendPasswordLinks && canSendLinks;
    const headers = new Headers(getRequestHeaders(event) as Record<string, string>);

    /** A row's values as createUser's input, or why it can't be. */
    async function toInput(values: Record<string, string>) {
        const value = (name: string) => (values[name] ?? '').trim();
        const email = value('email').toLowerCase();
        if (!email) return failure('IMPORT_EMAIL_MISSING', 'No email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return failure('INVALID_EMAIL', 'Invalid email');
        const password = values.password ?? '';
        if (password && (password.length < minPassword || password.length > maxPassword)) {
            return failure('IMPORT_PASSWORD_LENGTH', `The password must be ${minPassword}–${maxPassword} characters`);
        }
        const data: Record<string, unknown> = {};
        if (value('emailVerified')) data.emailVerified = truthy(value('emailVerified'));

        const username = value('username');
        if (username && usernamePlugin) {
            const min = usernamePlugin.options?.minUsernameLength ?? 3;
            const max = usernamePlugin.options?.maxUsernameLength ?? 30;
            if (!/^[a-zA-Z0-9_.]+$/.test(username) || username.length < min || username.length > max) {
                return failure('INVALID_USERNAME', 'Invalid username');
            }
            const taken = await context.adapter.count({
                model: 'user',
                where: [{ field: 'username', value: username.toLowerCase() }]
            });
            if (Number(taken) > 0) return failure('USERNAME_IS_ALREADY_TAKEN', 'Username is already taken');
            // As the Username plugin stores them: matched lowercased, shown as typed.
            data.username = username.toLowerCase();
            data.displayUsername = username;
        }

        for (const [name, field] of fields) {
            const text = value(name);
            if (!text) {
                if (field.required && field.defaultValue === undefined) {
                    return failure('IMPORT_FIELD_MISSING', `No ${name}`);
                }
                continue;
            }
            if (Array.isArray(field.type)) {
                if (!field.type.includes(text))
                    return failure('IMPORT_FIELD_INVALID', `${name}: not one of ${field.type.join(', ')}`);
                data[name] = text;
            } else if (field.type === 'boolean') data[name] = truthy(text);
            else if (field.type === 'number') {
                if (!Number.isFinite(Number(text))) return failure('IMPORT_FIELD_INVALID', `${name}: not a number`);
                data[name] = Number(text);
            } else if (field.type === 'date') {
                const date = new Date(text);
                if (Number.isNaN(date.getTime())) return failure('IMPORT_FIELD_INVALID', `${name}: not a date`);
                data[name] = date;
            } else if (field.type === 'string[]' || field.type === 'number[]') {
                const items = text
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);
                data[name] = field.type === 'number[]' ? items.map(Number) : items;
            } else data[name] = text;
        }

        // Better Auth stores several roles comma-separated, as the export writes them.
        const roles = value('role')
            .split(',')
            .map((role) => role.trim())
            .filter(Boolean);
        return {
            email,
            name: value('name') || email.split('@')[0]!,
            ...(password && { password }),
            ...(roles.length && { role: roles }),
            ...(Object.keys(data).length && { data })
        };
    }

    const created: Outcome[] = [];
    const skipped: Outcome[] = [];
    const failed: Outcome[] = [];
    // Claimed before anything is awaited, so two rows of a batch can't both take an email or a username.
    const seenEmails = new Set<string>();
    const seenUsernames = new Set<string>();
    let linksSent = 0;

    async function importRow(item: Row, index: number) {
        const row = item.row ?? index + 2;
        const { values } = item;
        const email = (values.email ?? '').trim().toLowerCase();
        const username = (values.username ?? '').trim().toLowerCase();
        if (email && seenEmails.has(email)) {
            skipped.push({ row, email, code: 'IMPORT_DUPLICATE_ROW', message: 'Already in this file' });
            return;
        }
        if (username && seenUsernames.has(username)) {
            failed.push({ row, email, code: 'USERNAME_IS_ALREADY_TAKEN', message: 'Username is already taken' });
            return;
        }
        seenEmails.add(email);
        if (username) seenUsernames.add(username);

        const input = await toInput(values);
        if ('code' in input) {
            failed.push({ row, email, ...input });
            return;
        }
        if (await context.internalAdapter.findUserByEmail(input.email)) {
            skipped.push({ row, email: input.email, code: 'USER_ALREADY_EXISTS', message: 'Already has an account' });
            return;
        }
        try {
            await (auth as unknown as ImportAuth).api.createUser({ body: input, headers });
        } catch (error) {
            const apiError = error as ApiError;
            failed.push({
                row,
                email: input.email,
                code: apiError.body?.code ?? 'FAILED_TO_CREATE_USER',
                message: apiError.body?.message ?? apiError.message ?? 'Failed to create the user'
            });
            return;
        }
        created.push({ row, email: input.email });
        if (sendLinks && !input.password) {
            await (auth as unknown as ImportAuth).api
                .requestPasswordReset({
                    body: { email: input.email, redirectTo: config.pages.resetPassword as string }
                })
                .then(() => linksSent++)
                .catch(() => {});
        }
    }

    for (let start = 0; start < rows.length; start += CONCURRENCY) {
        await Promise.all(
            rows.slice(start, start + CONCURRENCY).map((item, offset) => importRow(item, start + offset))
        );
    }
    const byRow = (a: Outcome, b: Outcome) => a.row - b.row;
    return {
        created: created.sort(byRow),
        skipped: skipped.sort(byRow),
        failed: failed.sort(byRow),
        linksSent
    };
});
