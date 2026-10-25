import { createError, defineEventHandler, getQuery, useRuntimeConfig } from '#imports';

import { ACTIVITY_MODEL } from '../activity/plugin';

import { requireAdminPermission, type AdminContext, type Where } from '../utils/admin';

/** Two years by week, or ten by month. Matches the home page. */
const MAX_BOUNDARIES = 120;

/**
 * Numbers for the admin home page, all from count queries on Better Auth's tables, so they stay fast as they
 * grow. `buckets` is a comma-separated list of ISO dates: the chart's period boundaries, in order, from the
 * start of the range to its end. The client sends them so periods follow the admin's time zone.
 */
export default defineEventHandler(async (event) => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });

    const boundaries = String(getQuery(event).buckets ?? '')
        .split(',')
        .filter(Boolean)
        .map((value) => new Date(value));
    if (
        boundaries.length < 2 ||
        boundaries.length > MAX_BOUNDARIES ||
        boundaries.some((date, i) => Number.isNaN(date.getTime()) || (i > 0 && date <= boundaries[i - 1]!))
    ) {
        throw createError({
            statusCode: 400,
            statusMessage: `buckets must be 2 to ${MAX_BOUNDARIES} increasing dates`
        });
    }
    const start = boundaries[0]!;
    const end = boundaries.at(-1)!;
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    const count = (model: string, where: Where[] = []) => context.adapter.count({ model, where }).then(Number);
    const signUps = (from: Date, to: Date) =>
        count('user', [
            { field: 'createdAt', operator: 'gte', value: from },
            { field: 'createdAt', operator: 'lt', value: to }
        ]);

    const [users, newUsers, previousNewUsers, banned, sessions, series] = await Promise.all([
        count('user'),
        signUps(start, end),
        signUps(previousStart, start),
        count('user', [{ field: 'banned', value: true }]),
        activeSessions(context, count),
        Promise.all(
            boundaries.slice(0, -1).map(async (from, i) => ({
                date: from,
                signUps: await signUps(from, boundaries[i + 1]!)
            }))
        )
    ]);
    // With activity tracking: users active within the last update interval.
    const config = useRuntimeConfig().public.betterAuthAdmin as { activityTracking: boolean; activityInterval: number };
    const online = config.activityTracking
        ? await count(ACTIVITY_MODEL, [
              { field: 'lastActiveAt', operator: 'gt', value: new Date(Date.now() - config.activityInterval) }
          ])
        : null;
    return { users, newUsers, previousNewUsers, banned, sessions, series, online };
});

/**
 * Unexpired sessions, or null when Better Auth keeps sessions only in secondary storage (eg Redis), where they
 * can't be counted.
 */
function activeSessions(context: AdminContext, count: (model: string, where?: Where[]) => Promise<number>) {
    if (context.options.secondaryStorage && !context.options.session?.storeSessionInDatabase) {
        return Promise.resolve(null);
    }
    return count('session', [{ field: 'expiresAt', operator: 'gt', value: new Date() }]);
}
