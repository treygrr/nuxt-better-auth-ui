// More of Better Auth's Organization plugin options, for those that are functions (betterAuthUi.organization.serverOptions).
// Loaded with the auth config, also at build time: no Nitro-only imports at the top level.
export default {
    organizationHooks: {
        afterCreateOrganization: async ({ organization }: { organization: { name: string } }) => {
            console.info(`[playground] organization created: ${organization.name}`);
        }
    }
};
