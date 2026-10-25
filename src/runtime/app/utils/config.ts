import { useRuntimeConfig } from '#imports';

/** The module options the admin pages need at runtime. */
export type BetterAuthAdminPublicConfig = {
    route: string;
    role: string;
    /** Every role: `user`, the admin role, then custom roles. */
    roles: string[];
    /** Roles that can open the admin pages. */
    staffRoles: string[];
    impersonation: boolean;
    auditLog: boolean;
    /** Whether "last sign-in" is known: the audit log records users' sign-ins. */
    lastSignIn: boolean;
    /** Days the audit log keeps entries; 0 keeps them forever. */
    auditLogRetentionDays: number;
};

export const useBetterAuthAdminConfig = () => useRuntimeConfig().public.betterAuthAdmin as BetterAuthAdminPublicConfig;

/** Turns an admin-relative path (`/`, `/inbox`) into a URL under the configured admin route. */
export const useAdminPath = () => {
    const { route } = useBetterAuthAdminConfig();
    return (path: string) => (path === '/' ? route : `${route}${path}`);
};
