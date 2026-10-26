import { defineEventHandler } from '#imports';

import { findAll, findUsersById, requireAdminPermission } from '../utils/admin';

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
    const rows = await findAll<{
        providerId: string;
        issuer: string;
        domain: string;
        domainVerified?: boolean | null;
        organizationId?: string | null;
        userId?: string | null;
        samlConfig?: string | null;
    }>(context, { model: 'ssoProvider' });

    // Each organization and owner once, in a query each.
    const organizationIds = [...new Set(rows.flatMap((row) => (row.organizationId ? [row.organizationId] : [])))];
    const organizations = new Map(
        (organizationIds.length
            ? await context.adapter
                  .findMany<{ id: string; name: string }>({
                      model: 'organization',
                      where: [{ field: 'id', operator: 'in', value: organizationIds }],
                      limit: organizationIds.length
                  })
                  // No Organization plugin: providers without organizations.
                  .catch(() => [])
            : []
        ).map((organization) => [organization.id, { id: organization.id, name: organization.name }])
    );
    const people = await findUsersById(
        context,
        rows.flatMap((row) => (row.userId ? [row.userId] : []))
    );
    return rows.map((row) => {
        const owner = row.userId ? people.get(row.userId) : undefined;
        return {
            providerId: row.providerId,
            type: row.samlConfig ? 'saml' : 'oidc',
            issuer: row.issuer,
            domain: row.domain,
            domainVerified: row.domainVerified ?? null,
            organization: row.organizationId ? (organizations.get(row.organizationId) ?? null) : null,
            owner: owner ? { id: owner.id, name: owner.name, email: owner.email } : null
        } satisfies AdminSsoProvider;
    });
});
