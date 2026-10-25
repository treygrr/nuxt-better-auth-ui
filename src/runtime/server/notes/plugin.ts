// A Better Auth plugin, loaded into the app's auth config, so no Nuxt or Nitro imports here.
import type { BetterAuthPlugin } from 'better-auth';

export const NOTES_MODEL = 'adminUserNote';

export type UserNote = {
    id: string;
    userId: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    body: string;
    createdAt: Date;
};

type Context = {
    adapter: {
        deleteMany(query: { model: string; where: Array<{ field: string; value: unknown }> }): Promise<unknown>;
    };
    logger: { error(message: string, ...args: unknown[]): void };
};

/**
 * Staff notes on users ("Warned for spam in chat"), in the module's own table, never Better Auth's. Drops a user's
 * notes when the user is deleted. The author's name and email are copied, so a note still says who wrote it after
 * its author's account is gone.
 */
export const adminUserNotes = () =>
    ({
        id: 'better-auth-ui-user-notes',
        schema: {
            [NOTES_MODEL]: {
                fields: {
                    userId: { type: 'string', required: true, index: true },
                    authorId: { type: 'string', required: true },
                    authorName: { type: 'string', required: true },
                    authorEmail: { type: 'string', required: true },
                    body: { type: 'string', required: true },
                    createdAt: { type: 'date', required: true }
                }
            }
        },
        // Typed loosely: the hook describes just the fields it reads.
        init: (() => ({
            options: {
                databaseHooks: {
                    user: {
                        delete: {
                            async after(user: { id: string }, ctx: { context: Context } | null | undefined) {
                                if (!ctx) return;
                                try {
                                    await ctx.context.adapter.deleteMany({
                                        model: NOTES_MODEL,
                                        where: [{ field: 'userId', value: user.id }]
                                    });
                                } catch (error) {
                                    ctx.context.logger.error("[better-auth-ui] Couldn't delete a user's notes", error);
                                }
                            }
                        }
                    }
                }
            }
        })) as never
    }) satisfies BetterAuthPlugin;
