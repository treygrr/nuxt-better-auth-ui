import { useAuthClient } from '@nuxtjs/better-auth/composables';

import type { AdminSession, AdminUser, AdminUserQuery } from '../types';

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

/** Better Auth's admin API for users, returning data or throwing an Error with a readable message. */
export const useAdminUsers = () => {
    const client = () => {
        const authClient = useAuthClient() as unknown as AdminClient | null;
        if (!authClient) throw new Error('The auth client is only available in the browser');
        return authClient;
    };
    const admin = () => client().admin;

    return {
        list: (query: AdminUserQuery) =>
            unwrap(
                admin().listUsers({
                    query: {
                        limit: query.limit,
                        offset: query.offset,
                        sortBy: query.sortBy ?? 'createdAt',
                        sortDirection: query.sortDirection ?? 'desc',
                        ...(query.search && {
                            searchValue: query.search,
                            searchField: query.searchField ?? 'email',
                            searchOperator: 'contains'
                        }),
                        ...(query.filter && {
                            filterField: query.filter.field,
                            filterValue: query.filter.value,
                            filterOperator: 'eq'
                        })
                    }
                })
            ),
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
        remove: (userId: string) => unwrap(admin().removeUser({ userId }))
    };
};
