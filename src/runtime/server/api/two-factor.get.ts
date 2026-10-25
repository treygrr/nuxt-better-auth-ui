import { defineEventHandler, requireUserSession, serverAuth } from '#imports';

import { signedInWithPasskey } from '../two-factor/passkey-sessions';

/** The signed-in user's two-factor set-up, for their account page. */
export type TwoFactorStatus = {
    enabled: boolean;
    /** An authenticator app is set up (and so are backup codes); without one, codes come by email only. */
    app: boolean;
    /** This session was started with a passkey, which is complete on its own (and satisfies `required`). */
    passkeySession: boolean;
};

type TwoFactorAuth = {
    $context: Promise<{
        getPlugin(id: 'two-factor'): { options?: { twoFactorTable?: string } } | undefined;
        adapter: {
            findOne<T>(query: { model: string; where: Array<{ field: string; value: unknown }> }): Promise<T | null>;
        };
        internalAdapter: Parameters<typeof signedInWithPasskey>[0];
    }>;
};

/**
 * Better Auth has no endpoint saying whether a user's authenticator app is set up, only the `twoFactorEnabled`
 * flag, so this looks up their row in the plugin's table (by user id, which it's queried by anyway). Only whether
 * it's verified: never the secret or backup codes.
 */
export default defineEventHandler(async (event): Promise<TwoFactorStatus> => {
    const { user, session } = await requireUserSession(event);
    const context = await (serverAuth(event) as unknown as TwoFactorAuth).$context;
    const plugin = context.getPlugin('two-factor');
    if (!plugin) return { enabled: false, app: false, passkeySession: false };
    const row = await context.adapter.findOne<{ verified?: boolean | null }>({
        model: plugin.options?.twoFactorTable ?? 'twoFactor',
        where: [{ field: 'userId', value: user.id }]
    });
    return {
        enabled: (user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled === true,
        app: row !== null && row.verified !== false,
        passkeySession: await signedInWithPasskey(context.internalAdapter, {
            id: (session as { id: string }).id,
            userId: user.id
        })
    };
});
