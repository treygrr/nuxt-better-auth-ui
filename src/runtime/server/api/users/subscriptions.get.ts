import { defineEventHandler, getRouterParam } from '#imports';

import { requireAdminPermission, requireUser } from '../../utils/admin';

/** A user's subscription (Stripe plugin), as the admin shows it: no Stripe ids. */
export type AdminSubscription = {
    id: string;
    plan: string;
    status: string;
    periodEnd: Date | null;
    trialEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    billingInterval: string | null;
};

/**
 * A user's subscriptions, newest first. Better Auth's Stripe plugin lists them only for their owner, so this reads its
 * `subscription` table with Better Auth's adapter, after the permission check the Admin plugin uses for viewing a user.
 */
export default defineEventHandler(async (event): Promise<AdminSubscription[]> => {
    const { context } = await requireAdminPermission(event, { user: ['get'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    if (!context.getPlugin('stripe')) return [];
    const rows = await context.adapter.findMany<AdminSubscription & { periodStart?: Date | null }>({
        model: 'subscription',
        where: [{ field: 'referenceId', value: user.id }],
        limit: 50
    });
    return rows
        .map((row) => ({
            id: row.id,
            plan: row.plan,
            status: row.status,
            periodEnd: row.periodEnd ?? null,
            trialEnd: row.trialEnd ?? null,
            cancelAtPeriodEnd: !!row.cancelAtPeriodEnd,
            billingInterval: row.billingInterval ?? null
        }))
        .sort((a, b) => new Date(b.periodEnd ?? 0).getTime() - new Date(a.periodEnd ?? 0).getTime());
});
