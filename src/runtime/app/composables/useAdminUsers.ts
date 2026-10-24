import { useAuthClient } from '@nuxtjs/better-auth/composables';
import { $fetch } from '#imports';

import { ADMIN_API } from '../../constants';

import type { AdminAccount, AdminSession, AdminUser, AdminUserQuery } from '../types';

type Result<T> = { data: T | null; error: { message?: string; code?: string } | null };

/**
 * The app's typed auth client doesn't know about the Admin plugin, which this module adds,
 * so the admin methods are described here.
 */
type AdminClient = {
    admin: {
        listUsers(input: { query: Record<string, unknown> }): Promise<Result<{ users: AdminUser[]; total: number }>>;
        getUser(input: { query: { id: string } }): Promise<Result<AdminUser>>;
        createUser(input: {
            email: string;
            password?: string;
            name: string;
            role?: string;
            data?: Record<string, unknown>;
        }): Promise<Result<{ user: AdminUser }>>;
        updateUser(input: { userId: string; data: Record<string, unknown> }): Promise<Result<AdminUser>>;
        setRole(input: { userId: string; role: string }): Promise<Result<{ user: AdminUser }>>;
        banUser(input: {
            userId: string;
            banReason?: string;
            banExpiresIn?: number;
        }): Promise<Result<{ user: AdminUser }>>;
        unbanUser(input: { userId: string }): Promise<Result<{ user: AdminUser }>>;
        setUserPassword(input: { userId: string; newPassword: string }): Promise<Result<{ status: boolean }>>;
        listUserSessions(input: { userId: string }): Promise<Result<{ sessions: AdminSession[] }>>;
        revokeUserSession(input: { sessionToken: string }): Promise<Result<{ success: boolean }>>;
        revokeUserSessions(input: { userId: string }): Promise<Result<{ success: boolean }>>;
        removeUser(input: { userId: string }): Promise<Result<{ success: boolean }>>;
    };
    requestPasswordReset(input: { email: string; redirectTo?: string }): Promise<Result<{ status: boolean }>>;
};

const unwrap = async <T>(request: Promise<Result<T>>): Promise<T> => {
    const { data, error } = await request;
    if (error) throw new Error(error.message || error.code || 'The request failed');
    return data as T;
};

/** Rethrows a failed $fetch to this module's routes as an Error with the server's message. */
const fetchError = (error: { data?: { statusMessage?: string; message?: string }; message?: string }): never => {
    throw new Error(error?.data?.statusMessage || error?.data?.message || error?.message || 'The request failed');
};

/** Better Auth's admin API for users, returning data or throwing an Error with a readable message. */
export const useAdminUsers = () => {
    const client = () => {
        const authClient = useAuthClient() as unknown as AdminClient | null;
        if (!authClient) throw new Error('The auth client is only available in the browser');
        return authClient;
    };
    const admin = () => client().admin;

    return {
        /** The users list, from the module's own route: its filters combine and include sign-in method. */
        list: ({ filters, ...query }: AdminUserQuery) =>
            $fetch<{ users: AdminUser[]; total: number }>(`${ADMIN_API}/users`, {
                query: { ...query, ...filters }
            }).catch(fetchError),
        /** The sign-in methods in use or configured, for the sign-in filter. */
        providersInUse: () => $fetch<string[]>(`${ADMIN_API}/providers`).catch(fetchError),
        get: (id: string) => unwrap(admin().getUser({ query: { id } })),
        create: (input: { name: string; email: string; password?: string; role: string }) =>
            unwrap(admin().createUser(input)).then(({ user }) => user),
        update: (userId: string, data: Partial<Pick<AdminUser, 'name' | 'email' | 'image' | 'emailVerified'>>) =>
            unwrap(admin().updateUser({ userId, data })),
        setRole: (userId: string, role: string) => unwrap(admin().setRole({ userId, role })),
        ban: (userId: string, banReason?: string, banExpiresIn?: number) =>
            unwrap(admin().banUser({ userId, banReason, banExpiresIn })),
        unban: (userId: string) => unwrap(admin().unbanUser({ userId })),
        setPassword: (userId: string, newPassword: string) => unwrap(admin().setUserPassword({ userId, newPassword })),
        /** Emails the user a link to choose a new password, through the app's own reset flow. */
        sendPasswordReset: (email: string, redirectTo?: string) =>
            unwrap(client().requestPasswordReset({ email, redirectTo })),
        sessions: (userId: string) => unwrap(admin().listUserSessions({ userId })).then(({ sessions }) => sessions),
        revokeSession: (sessionToken: string) => unwrap(admin().revokeUserSession({ sessionToken })),
        revokeSessions: (userId: string) => unwrap(admin().revokeUserSessions({ userId })),
        remove: (userId: string) => unwrap(admin().removeUser({ userId })),
        /** Linked sign-in methods, from this module's own route (the Admin plugin has none). */
        accounts: (userId: string) =>
            $fetch<AdminAccount[]>(`${ADMIN_API}/users/${encodeURIComponent(userId)}/accounts`).catch(fetchError),
        /** Sign-in methods of several users at once, as `{ [userId]: providerIds }`, for the users list. */
        providers: (userIds: string[]) =>
            $fetch<Record<string, string[]>>(`${ADMIN_API}/accounts`, { query: { userIds: userIds.join(',') } }).catch(
                fetchError
            ),
        /** Removes one sign-in method; the server refuses to remove a user's last one. */
        removeAccount: (userId: string, accountId: string) =>
            $fetch(`${ADMIN_API}/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}`, {
                method: 'DELETE'
            }).catch(fetchError)
    };
};
