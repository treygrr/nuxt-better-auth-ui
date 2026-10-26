import { createError, defineEventHandler, requireUserSession, serverAuth, useRuntimeConfig } from '#imports';
import * as z from 'zod';

import type { AuditPerson } from '../audit/plugin';
import { recordAdminAction, type AdminContext } from '../utils/admin';
import { readJsonBody } from '../utils/input';

type ApiKeyAuth = {
    api: {
        createApiKey(input: {
            body: { userId: string; name: string; expiresIn?: number; permissions?: Record<string, string[]> };
        }): Promise<{ id: string; key: string; name: string | null; start: string | null; expiresAt: Date | null }>;
    };
    $context: Promise<AdminContext>;
};

/** Expiry choices, in days, as Better Auth allows from 1 to 365; null never expires. */
const EXPIRES_IN_DAYS = [30, 90, 365];

const Body = z.object({
    name: z.string().trim().min(1).max(64),
    expiresInDays: z
        .literal(EXPIRES_IN_DAYS)
        .nullish()
        .transform((days) => days ?? null),
    // "resource:action" strings, checked against the module's scopes below.
    scopes: z.array(z.string()).default([])
});

/**
 * Creates an API key for the signed-in user. Better Auth only takes a key's permissions from server calls, so this
 * calls its server API (`createApiKey`, with the user's id) after checking the permissions are among the module's
 * `apiKey.scopes`. Returns the key, which is shown once.
 */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event);
    if ((user as { isAnonymous?: boolean | null }).isAnonymous) {
        throw createError({
            statusCode: 403,
            statusMessage: "Guest accounts can't have API keys",
            data: { code: 'GUEST_NO_API_KEYS' }
        });
    }
    // Each error's code is translated on the page (errors.<code>); the message is the English fallback.
    const {
        name,
        expiresInDays: days,
        scopes
    } = await readJsonBody(event, Body, {
        name: { code: 'API_KEY_NAME_INVALID', message: 'Name the key (64 characters at most)' },
        expiresInDays: { code: 'API_KEY_EXPIRY_INVALID', message: 'Choose when the key expires' },
        scopes: { code: 'API_KEY_PERMISSION_UNKNOWN', message: 'Unknown permission' }
    });

    // Each one the module allows.
    const allowed = (useRuntimeConfig(event).public.betterAuthUi as { apiKeyScopes: Record<string, string[]> })
        .apiKeyScopes;
    const permissions: Record<string, string[]> = {};
    for (const scope of scopes) {
        const [resource, action] = scope.split(':');
        if (!resource || !action || !allowed[resource]?.includes(action)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Unknown permission',
                data: { code: 'API_KEY_PERMISSION_UNKNOWN', scope }
            });
        }
        (permissions[resource] ??= []).push(action);
    }

    const auth = serverAuth(event) as unknown as ApiKeyAuth;
    const created = await auth.api.createApiKey({
        body: {
            userId: user.id,
            name,
            ...(days !== null && { expiresIn: days * 86_400 }),
            ...(Object.keys(permissions).length && { permissions })
        }
    });
    await recordAdminAction(event, await auth.$context, {
        action: 'auth.api-key-created',
        actor: user as AuditPerson,
        target: user as AuditPerson,
        details: { name, permissions: Object.keys(permissions).length ? permissions : null }
    });
    return {
        id: created.id,
        key: created.key,
        name: created.name,
        start: created.start,
        expiresAt: created.expiresAt
    };
});
