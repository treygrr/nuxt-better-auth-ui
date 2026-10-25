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
    /** Opt-in activity tracking: "last active" and "online now". */
    activityTracking: boolean;
    /** How often activity is recorded, in ms: "online now" means active within it. */
    activityInterval: number;
    /** Days the audit log keeps entries; 0 keeps them forever. */
    auditLogRetentionDays: number;
    /** Staff notes on users. */
    notes: boolean;
    /** The module added the Organization plugin: the admin's organization pages. */
    organizations: boolean;
    /** The module added the SSO plugin: the admin's SSO providers page. */
    sso: boolean;
    /** Whether the app set an email sender, and the emails it has its own template for. */
    emails: { send: boolean; templates: string[] };
};

export const useBetterAuthAdminConfig = () =>
    (useRuntimeConfig().public.betterAuthUi as { admin: BetterAuthAdminPublicConfig }).admin;

/** Turns an admin-relative path (`/`, `/users`) into a URL under the configured admin route. */
export const useAdminPath = () => {
    const { route } = useBetterAuthAdminConfig();
    return (path: string) => (path === '/' ? route : `${route}${path}`);
};
