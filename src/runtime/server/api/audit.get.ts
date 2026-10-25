import { defineEventHandler, getQuery, useRuntimeConfig } from '#imports';

import { AUDIT_MODEL, retentionCutoff } from '../audit/plugin';
import { requireAdminPermission, type Where } from '../utils/admin';

const MAX_LIMIT = 100;

type Row = Record<string, unknown> & { details: string | null };

/**
 * The audit log, newest first: `limit`, `offset`, and optionally `userId` (entries where they acted or were
 * acted on) or `action`. Better Auth has no permission for the log, so it uses the one for listing users.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const query = getQuery(event);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), MAX_LIMIT);
    const offset = Math.max(Number(query.offset) || 0, 0);

    // Entries past the retention period, which pruning may not have reached yet, are never shown.
    const { auditLogRetentionDays } = useRuntimeConfig().public.betterAuthAdmin as { auditLogRetentionDays: number };
    const cutoff = retentionCutoff(auditLogRetentionDays);
    const where: Where[] = cutoff ? [{ field: 'createdAt', operator: 'gte', value: cutoff }] : [];
    if (typeof query.action === 'string' && query.action) where.push({ field: 'action', value: query.action });
    if (typeof query.userId === 'string' && query.userId) {
        where.push(
            { field: 'targetId', value: query.userId, connector: 'OR' },
            { field: 'actorId', value: query.userId, connector: 'OR' }
        );
    }

    const [rows, total] = await Promise.all([
        context.adapter.findMany<Row>({
            model: AUDIT_MODEL,
            where,
            limit,
            offset,
            sortBy: { field: 'createdAt', direction: 'desc' }
        }),
        context.adapter.count({ model: AUDIT_MODEL, where })
    ]);
    return {
        entries: rows.map((row) => ({ ...row, details: row.details ? JSON.parse(row.details) : null })),
        total: Number(total)
    };
});
