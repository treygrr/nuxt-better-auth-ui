import { defineEventHandler, requireUserSession, serverAuth, setResponseHeader } from '#imports';

import { ACTIVITY_MODEL } from '../activity/plugin';
import { AUDIT_MODEL, parseDetails } from '../audit/plugin';
import { findAll, type AdminContext } from '../utils/admin';

type Row = Record<string, unknown>;
type ExportAuth = {
    $context: Promise<
        AdminContext & {
            internalAdapter: AdminContext['internalAdapter'] & {
                findUserById(id: string): Promise<Row | null>;
                listSessions(userId: string): Promise<Row[]>;
            };
            getPlugin(id: string): { options?: Record<string, unknown> } | undefined;
        }
    >;
};

/** Rows of a table that may not exist (a plugin or option that's off): none, then. */
async function optional<T>(read: () => Promise<T[]>) {
    try {
        return await read();
    } catch {
        return [];
    }
}

/**
 * Everything the app's auth keeps about the signed-in user, as a JSON download (GDPR's right of access): their user
 * row (with the app's own fields), sign-in methods, sessions, passkeys, API keys, two-factor, last activity and their audit
 * history. Never secrets: no password hashes, tokens, two-factor secrets, backup codes or passkey keys. Audit entries
 * by an admin say so, without the admin's name, email, IP or browser.
 */
export default defineEventHandler(async (event) => {
    const { user, session } = await requireUserSession(event);
    const context = await (serverAuth(event) as unknown as ExportAuth).$context;
    const userId = user.id;

    const [profile, accounts, sessions] = await Promise.all([
        context.internalAdapter.findUserById(userId),
        context.internalAdapter.findAccounts(userId),
        context.internalAdapter.listSessions(userId)
    ]);
    const passkeys = context.getPlugin('passkey')
        ? await optional(() => findAll<Row>(context, { model: 'passkey', where: [{ field: 'userId', value: userId }] }))
        : [];
    const apiKeys = context.getPlugin('api-key')
        ? await optional(() =>
              findAll<Row>(context, { model: 'apikey', where: [{ field: 'referenceId', value: userId }] })
          )
        : [];
    const [activity] = await optional(() =>
        findAll<{ lastActiveAt: Date }>(context, {
            model: ACTIVITY_MODEL,
            where: [{ field: 'userId', value: userId }]
        })
    );
    // What they did, and what was done to them: two indexed queries (Better Auth's adapters group OR conditions
    // apart from AND ones), merged.
    const [byThem, toThem] = await Promise.all(
        (['actorId', 'targetId'] as const).map((field) =>
            optional(() => findAll<Row>(context, { model: AUDIT_MODEL, where: [{ field, value: userId }] }))
        )
    );
    const audit = [...new Map([...byThem!, ...toThem!].map((entry) => [entry.id, entry])).values()];

    const currentSession = (session as { id: string }).id;
    setResponseHeader(event, 'content-type', 'application/json; charset=utf-8');
    setResponseHeader(event, 'content-disposition', 'attachment; filename="account-data.json"');
    setResponseHeader(event, 'cache-control', 'no-store');
    return {
        exportedAt: new Date(),
        user: profile,
        signInMethods: accounts.map((account) => ({
            provider: account.providerId,
            accountId: account.providerId === 'credential' ? undefined : account.accountId,
            scope: account.scope ?? undefined,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt
        })),
        sessions: sessions.map((row) => ({
            current: row.id === currentSession,
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
            ipAddress: row.ipAddress ?? null,
            userAgent: row.userAgent ?? null
        })),
        passkeys: passkeys.map((passkey) => ({
            name: passkey.name ?? null,
            deviceType: passkey.deviceType ?? null,
            backedUp: passkey.backedUp ?? null,
            createdAt: passkey.createdAt ?? null
        })),
        // Never the key (Better Auth keeps only its hash): its name, first characters and use.
        apiKeys: apiKeys.map((key) => ({
            name: key.name ?? null,
            start: key.start ?? null,
            permissions: parseDetails(key.permissions),
            expiresAt: key.expiresAt ?? null,
            lastRequest: key.lastRequest ?? null,
            createdAt: key.createdAt ?? null
        })),
        twoFactor: { enabled: (profile as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled === true },
        lastActiveAt: activity?.lastActiveAt ?? null,
        history: audit
            .map((entry) => {
                const byThem = entry.actorId === userId;
                return {
                    action: entry.action,
                    at: entry.createdAt,
                    by: byThem ? 'you' : 'an admin',
                    details: parseDetails(entry.details),
                    ...(byThem && { ipAddress: entry.ipAddress ?? null, userAgent: entry.userAgent ?? null })
                };
            })
            .sort((a, b) => new Date(b.at as string).getTime() - new Date(a.at as string).getTime())
    };
});
