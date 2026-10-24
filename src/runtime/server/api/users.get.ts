import { createError, defineEventHandler, getQuery } from '#imports';
import { parseUserOutput } from 'better-auth/db';

import { findAll, requireAdminPermission, type AdminContext, type Where } from '../utils/admin';

const SORTABLE = ['createdAt', 'updatedAt', 'name', 'email', 'role'];
const MAX_LIMIT = 100;

/**
 * The users list. Like Better Auth's `/admin/list-users` (same permission, same output), but its filters
 * combine, and it can filter by sign-in method, which Better Auth's can't:
 *
 * - `role`, `banned` (`true`/`false`), `emailVerified` (`true`/`false`)
 * - `signIn`: `credential` (has a password), `social` (has any social link), `social-only` (no password), or a
 *   provider id such as `github`
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const query = getQuery(event);
    const text = (key: string) => (typeof query[key] === 'string' && query[key] ? (query[key] as string) : undefined);

    const where: Where[] = [];
    const search = text('search')?.trim();
    if (search) {
        where.push({ field: text('searchField') === 'name' ? 'name' : 'email', operator: 'contains', value: search });
    }
    const role = text('role');
    if (role) where.push({ field: 'role', value: role });
    for (const field of ['banned', 'emailVerified']) {
        const value = text(field);
        if (value === 'true' || value === 'false') where.push({ field, value: value === 'true' });
    }

    const signIn = text('signIn');
    if (signIn) {
        const ids = await usersSigningInWith(context, signIn);
        if (!ids.length) return { users: [], total: 0 };
        where.push({ field: 'id', operator: 'in', value: ids });
    }

    const limit = Math.min(Number(text('limit')) || 20, MAX_LIMIT);
    const offset = Math.max(Number(text('offset')) || 0, 0);
    const sortBy = SORTABLE.includes(text('sortBy') ?? '') ? text('sortBy')! : 'createdAt';
    const direction = text('sortDirection') === 'asc' ? 'asc' : 'desc';
    if (!Number.isInteger(limit) || limit < 1) throw createError({ statusCode: 400, statusMessage: 'Invalid limit' });

    const [users, total] = await Promise.all([
        context.adapter.findMany<Record<string, unknown>>({
            model: 'user',
            where,
            limit,
            offset,
            sortBy: { field: sortBy, direction }
        }),
        context.adapter.count({ model: 'user', where })
    ]);
    return {
        users: users.map((user) => parseUserOutput(context.options as never, user as never)),
        total: Number(total)
    };
});

/** The ids of users with a matching sign-in method, from the account table. */
async function usersSigningInWith(context: AdminContext, signIn: string) {
    const accounts = (where: Where) =>
        findAll<{ userId: string }>(context, { model: 'account', where: [where], select: ['userId'] }).then(
            (rows) => new Set(rows.map((row) => row.userId))
        );

    if (signIn === 'social' || signIn === 'social-only') {
        const social = await accounts({ field: 'providerId', operator: 'ne', value: 'credential' });
        if (signIn === 'social') return [...social];
        const withPassword = await accounts({ field: 'providerId', value: 'credential' });
        return [...social].filter((id) => !withPassword.has(id));
    }
    return [...(await accounts({ field: 'providerId', value: signIn }))];
}
