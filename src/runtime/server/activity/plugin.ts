// A Better Auth plugin, loaded into the app's auth config, so no Nuxt or Nitro imports here.
import { createAuthMiddleware } from 'better-auth/api';
import type { BetterAuthPlugin } from 'better-auth';

export const ACTIVITY_MODEL = 'adminUserActivity';
export const DEFAULT_UPDATE_INTERVAL = 5 * 60 * 1000;

type Context = {
    adapter: {
        findOne<T>(query: { model: string; where: Array<{ field: string; value: unknown }> }): Promise<T | null>;
        create(query: { model: string; data: Record<string, unknown> }): Promise<unknown>;
        update(query: {
            model: string;
            where: Array<{ field: string; value: unknown }>;
            update: Record<string, unknown>;
        }): Promise<unknown>;
    };
    logger: { error(message: string, ...args: unknown[]): void };
    runInBackground?: (task: Promise<unknown>) => void;
};

/**
 * Opt-in "last active": when Better Auth checks a signed-in user's session (their page loads), records the time
 * in the module's own `adminUserActivity` table, at most once per user per `updateInterval` on each server.
 * Better Auth's own dashboard does the same with a `lastActiveAt` user column
 * (https://better-auth.com/docs/infrastructure/plugins/dashboard#activity-tracking); this keeps Better Auth's
 * tables as they are. Writes scale with signed-in users: about one per user per interval.
 */
export const adminActivityTracking = ({
    updateInterval = DEFAULT_UPDATE_INTERVAL
}: { updateInterval?: number } = {}) => {
    // When each user was last written from this server, so most checks write nothing.
    const lastWritten = new Map<string, number>();

    async function record(context: Context, userId: string, now: Date) {
        try {
            const existing = await context.adapter.findOne<{ id: string }>({
                model: ACTIVITY_MODEL,
                where: [{ field: 'userId', value: userId }]
            });
            if (existing) {
                await context.adapter.update({
                    model: ACTIVITY_MODEL,
                    where: [{ field: 'id', value: existing.id }],
                    update: { lastActiveAt: now }
                });
            } else {
                await context.adapter.create({ model: ACTIVITY_MODEL, data: { userId, lastActiveAt: now } });
            }
        } catch (error) {
            context.logger.error('[better-auth-admin] Could not record activity. Have migrations run?', error);
        }
    }

    return {
        id: 'better-auth-admin-activity',
        schema: {
            [ACTIVITY_MODEL]: {
                fields: {
                    userId: { type: 'string', required: true, unique: true },
                    lastActiveAt: { type: 'date', required: true, index: true }
                }
            }
        },
        hooks: {
            after: [
                {
                    matcher: (ctx) => ctx.path === '/get-session',
                    handler: createAuthMiddleware(async (ctx) => {
                        const returned = ctx.context.returned as { user?: { id: string } } | null | undefined;
                        const userId = returned?.user?.id;
                        if (!userId) return;
                        const now = Date.now();
                        if (now - (lastWritten.get(userId) ?? 0) < updateInterval) return;
                        lastWritten.set(userId, now);
                        // Forget users not seen for a while, so the map stays small.
                        if (lastWritten.size > 10_000) {
                            for (const [id, at] of lastWritten) if (now - at > updateInterval) lastWritten.delete(id);
                        }
                        const context = ctx.context as unknown as Context;
                        // After the response: page loads don't wait for it.
                        const task = record(context, userId, new Date(now));
                        if (context.runInBackground) context.runInBackground(task);
                        else await task;
                    })
                }
            ]
        }
    } satisfies BetterAuthPlugin;
};
