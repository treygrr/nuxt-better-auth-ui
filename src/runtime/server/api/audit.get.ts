import { defineEventHandler, useRuntimeConfig } from '#imports';
import * as z from 'zod';

import { AUDIT_MODEL, retentionCutoff } from '../audit/plugin';
import { requireAdminPermission, type Where } from '../utils/admin';
import { readQuery, text, wholeNumber } from '../utils/input';

const MAX_LIMIT = 100;

const Query = z.object({
    limit: wholeNumber(20, { min: 1, max: MAX_LIMIT }),
    offset: wholeNumber(0),
    action: text(),
    userId: text()
});

type Row = Record<string, unknown> & { details: string | null };

/**
 * The audit log, newest first: `limit`, `offset`, and optionally `userId` (entries where they acted or were
 * acted on) or `action`. Better Auth has no permission for the log, so it uses the one for listing users.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    const { limit, offset, action, userId } = readQuery(event, Query);

    // Entries past the retention period, which pruning may not have reached yet, are never shown.
    const { auditLogRetentionDays } = (
        useRuntimeConfig(event).public.betterAuthUi as { admin: { auditLogRetentionDays: number } }
    ).admin;
    const cutoff = retentionCutoff(auditLogRetentionDays);
    const where: Where[] = cutoff ? [{ field: 'createdAt', operator: 'gte', value: cutoff }] : [];
    if (action) where.push({ field: 'action', value: action });
    if (userId) {
        where.push(
            { field: 'targetId', value: userId, connector: 'OR' },
            { field: 'actorId', value: userId, connector: 'OR' }
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
