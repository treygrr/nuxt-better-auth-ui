// More of Better Auth's SSO plugin options, for those that are functions (betterAuthUi.sso.serverOptions).
// Loaded with the auth config, also at build time: no Nitro-only imports at the top level.
export default {
    organizationProvisioning: {
        // Members who sign in through their organization's identity provider join it: leads as admins, others with
        // the default role.
        getRole: async ({ user }: { user: { email: string } }) =>
            user.email.startsWith('lead.') ? ('admin' as const) : ('member' as const)
    }
};
