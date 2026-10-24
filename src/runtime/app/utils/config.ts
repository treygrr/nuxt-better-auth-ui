import { useRuntimeConfig } from '#imports';

/** The module options the admin pages need at runtime. */
export type BetterAuthAdminPublicConfig = {
    route: string;
    role: string;
    impersonation: boolean;
};

export const useBetterAuthAdminConfig = () => useRuntimeConfig().public.betterAuthAdmin as BetterAuthAdminPublicConfig;
