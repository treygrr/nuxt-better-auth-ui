import { defineEventHandler } from '#imports';
import * as z from 'zod';

import { requireAdminPermission, type Where } from '../../utils/admin';
import { readQuery, text, wholeNumber } from '../../utils/input';

/** An organization, as the admin's list shows it. */
export type AdminOrganization = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
    members: number;
};

const PAGE_SIZE = 20;

const Query = z.object({ page: wholeNumber(1, { min: 1 }), search: text() });

/**
 * Every organization (Better Auth's Organization plugin), newest first, a page at a time, with how many members each
 * has, for staff (`user: list`). The plugin only lists the signed-in user's own, so this reads its tables with Better
 * Auth's adapter. `?search=` matches names.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    if (!context.getPlugin('organization')) return { organizations: [] as AdminOrganization[], total: 0 };
    const { page, search } = readQuery(event, Query);
    const where: Where[] = search ? [{ field: 'name', operator: 'contains', value: search }] : [];

    const [rows, total] = await Promise.all([
        context.adapter.findMany<Omit<AdminOrganization, 'members'>>({
            model: 'organization',
            where,
            sortBy: { field: 'createdAt', direction: 'desc' },
            limit: PAGE_SIZE,
            offset: (page - 1) * PAGE_SIZE
        }),
        context.adapter.count({ model: 'organization', where })
    ]);
    const organizations = await Promise.all(
        rows.map(async (row) => ({
            id: row.id,
            name: row.name,
            slug: row.slug,
            logo: row.logo ?? null,
            createdAt: row.createdAt,
            members: Number(
                await context.adapter.count({ model: 'member', where: [{ field: 'organizationId', value: row.id }] })
            )
        }))
    );
    return { organizations, total: Number(total), pageSize: PAGE_SIZE };
});
