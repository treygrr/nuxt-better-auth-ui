import { defineEventHandler, setResponseHeader } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { toCsv } from '../../../csv';
import { findAll, recordAdminAction, requireAdminPermission } from '../../utils/admin';

type UserRow = Record<string, unknown> & { id: string };
type AdditionalField = { type: string | string[]; returned?: boolean };

/**
 * Every user as CSV, for staff who can list users (`user: list`): Better Auth's user fields, the plugins' (username,
 * phone number, two-factor, guest), the app's own (`user.additionalFields`, except those Better Auth never returns),
 * and their sign-in methods. Never passwords, tokens or secrets. The columns the import reads come first, so an export
 * can be imported elsewhere. Recorded in the audit log.
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context } = await requireAdminPermission(event, { user: ['list'] });
    const options = context.options as { user?: { additionalFields?: Record<string, AdditionalField> } };

    const plugin = (id: string) => !!context.getPlugin(id);
    const columns = [
        'name',
        'email',
        'emailVerified',
        'role',
        ...(plugin('username') ? ['username', 'displayUsername'] : []),
        ...Object.entries(options.user?.additionalFields ?? {})
            .filter(([, field]) => field.returned !== false)
            .map(([name]) => name),
        'id',
        'banned',
        'banReason',
        'banExpires',
        ...(plugin('phone-number') ? ['phoneNumber', 'phoneNumberVerified'] : []),
        ...(plugin('two-factor') ? ['twoFactorEnabled'] : []),
        ...(plugin('anonymous') ? ['isAnonymous'] : []),
        'createdAt',
        'updatedAt'
    ];

    const users = await findAll<UserRow>(context, { model: 'user' });
    // Their sign-in methods, by user: "credential" is email and password.
    const methods = new Map<string, string[]>();
    for (const account of await findAll<{ userId: string; providerId: string }>(context, {
        model: 'account',
        select: ['userId', 'providerId']
    })) {
        methods.set(account.userId, [...(methods.get(account.userId) ?? []), account.providerId]);
    }

    const csv = toCsv([
        [...columns, 'signInMethods'],
        ...users
            .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
            .map((user) => [...columns.map((column) => user[column]), (methods.get(user.id) ?? []).join(' ')])
    ]);

    await recordAdminAction(event, context, {
        action: 'users.export',
        actor: admin as AuditPerson,
        target: null,
        details: { count: users.length }
    });
    setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8');
    setResponseHeader(
        event,
        'content-disposition',
        `attachment; filename="users-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    setResponseHeader(event, 'cache-control', 'no-store');
    return csv;
});
