import { useRuntimeConfig } from '#imports';

import type { AdminPermissions } from '../composables/useBetterAuthAdminCan';

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
export const useBetterAuthAdminPath = () => {
    const { route } = useBetterAuthAdminConfig();
    return (path: string) => (path === '/' ? route : `${route}${path}`);
};

/**
 * An app page's place in the admin, from its page meta: `definePageMeta({ betterAuthAdmin: { label: 'Reports',
 * icon: 'i-lucide-chart-bar' } })`. Pages under the admin route get its layout and its staff-only access anyway; this
 * adds them to the sidebar and search, and limits them to the roles with these permissions.
 */
export type BetterAuthAdminPageMeta = {
    /** The sidebar and search entry: a translation key (`betterAuthUi.messages`) or the words themselves. None, no entry. */
    label?: string;
    /** An icon name, eg `i-lucide-chart-bar`. */
    icon?: string;
    /** The Better Auth Admin permissions the page needs, eg `{ user: ['list'] }`; others get a 403. */
    permissions?: AdminPermissions;
    /** Where it goes among the app's own entries, lowest first; then by path. @default 0 */
    order?: number;
};
