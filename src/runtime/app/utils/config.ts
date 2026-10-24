import { useRuntimeConfig } from '#imports';

/** The module options the admin pages need at runtime. */
export type BetterAuthAdminPublicConfig = {
    route: string;
    role: string;
    impersonation: boolean;
    auditLog: boolean;
};

export const useBetterAuthAdminConfig = () => useRuntimeConfig().public.betterAuthAdmin as BetterAuthAdminPublicConfig;

/** Turns an admin-relative path (`/`, `/inbox`) into a URL under the configured admin route. */
export const useAdminPath = () => {
    const { route } = useBetterAuthAdminConfig();
    return (path: string) => (path === '/' ? route : `${route}${path}`);
};
