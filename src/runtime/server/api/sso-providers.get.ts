import { defineEventHandler } from '#imports';

import { requireAdminPermission } from '../utils/admin';

/** An SSO provider, as the admin lists it: never its client secret, keys or certificates. */
export type AdminSsoProvider = {
    providerId: string;
    type: 'oidc' | 'saml';
    issuer: string;
    domain: string;
    domainVerified: boolean | null;
    organization: { id: string; name: string } | null;
    owner: { id: string; name: string; email: string } | null;
};

/**
 * Every SSO provider (Better Auth's SSO plugin), for staff (`user: list`). Better Auth lists only the providers the
 * signed-in user owns or administers, so this reads its `ssoProvider` table with Better Auth's adapter, keeping only
 * what identifies each provider. Changes go through Better Auth's endpoints, which check the user may make them.
 */
export default defineEventHandler(async (event): Promise<AdminSsoProvider[]> => {
    const { context } = await requireAdminPermission(event, { user: ['list'] });
    if (!context.getPlugin('sso')) return [];
    const rows = await context.adapter.findMany<{
        providerId: string;
        issuer: string;
        domain: string;
        domainVerified?: boolean | null;
        organizationId?: string | null;
        userId?: string | null;
        samlConfig?: string | null;
    }>({ model: 'ssoProvider', limit: 1000 });

    const organizations = new Map<string, AdminSsoProvider['organization']>();
    const people = new Map<string, AdminSsoProvider['owner']>();
    return Promise.all(
        rows.map(async (row) => {
            if (row.organizationId && !organizations.has(row.organizationId)) {
                const [organization] = await context.adapter
                    .findMany<{ id: string; name: string }>({
                        model: 'organization',
                        where: [{ field: 'id', value: row.organizationId }],
                        limit: 1
                    })
                    .catch(() => []);
                organizations.set(
                    row.organizationId,
                    organization ? { id: organization.id, name: organization.name } : null
                );
            }
            if (row.userId && !people.has(row.userId)) {
                const user = await context.internalAdapter.findUserById(row.userId);
                people.set(row.userId, user ? { id: user.id, name: user.name, email: user.email } : null);
            }
            return {
                providerId: row.providerId,
                type: row.samlConfig ? 'saml' : 'oidc',
                issuer: row.issuer,
                domain: row.domain,
                domainVerified: row.domainVerified ?? null,
                organization: row.organizationId ? (organizations.get(row.organizationId) ?? null) : null,
                owner: row.userId ? (people.get(row.userId) ?? null) : null
            } satisfies AdminSsoProvider;
        })
    );
});
