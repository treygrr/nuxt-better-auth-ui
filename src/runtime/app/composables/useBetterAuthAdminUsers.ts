import { useAuthClient } from '@nuxtjs/better-auth/composables';
import { $fetch, useAuthI18n } from '#imports';

import { ADMIN_API } from '../../constants';

import type { AdminUser } from '../types';
import { serverError } from '../utils/server-error';

type Result<T> = { data: T | null; error: { message?: string; code?: string } | null };

/**
 * The app's typed auth client doesn't know about the Admin plugin, which this module adds,
 * so the admin methods are described here.
 */
type AdminClient = {
    admin: {
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
        revokeUserSession(input: { sessionToken: string }): Promise<Result<{ success: boolean }>>;
        revokeUserSessions(input: { userId: string }): Promise<Result<{ success: boolean }>>;
        removeUser(input: { userId: string }): Promise<Result<{ success: boolean }>>;
        impersonateUser(input: { userId: string }): Promise<Result<unknown>>;
        stopImpersonating(): Promise<Result<unknown>>;
    };
    requestPasswordReset(input: { email: string; redirectTo?: string }): Promise<Result<{ status: boolean }>>;
};

/**
 * Better Auth's admin actions on users, returning data or throwing an Error with a readable message. Pages read
 * their data with useFetch instead, so it's fetched during server rendering.
 */
export const useBetterAuthAdminUsers = () => {
    const { t, errorMessage } = useAuthI18n();
    const unwrap = async <T>(request: Promise<Result<T>>): Promise<T> => {
        const { data, error } = await request;
        // Translated by Better Auth's code where there's a translation, else its message.
        if (error) throw new Error(errorMessage(error) || t('admin.common.requestFailed'));
        return data as T;
    };
    /** Rethrows a failed $fetch to this module's routes as an Error in words, translated by its code. */
    const fetchError = (error: unknown): never => {
        throw new Error(errorMessage(serverError(error)) || t('admin.common.requestFailed'));
    };

    const client = () => {
        const authClient = useAuthClient() as unknown as AdminClient | null;
        if (!authClient) throw new Error('The auth client is only available in the browser');
        return authClient;
    };
    const admin = () => client().admin;

    return {
        create: (input: { name: string; email: string; password?: string; role: string }) =>
            unwrap(admin().createUser(input)).then(({ user }) => user),
        /** Better Auth's fields, and the app's own (`user.additionalFields`). */
        update: (
            userId: string,
            data: Partial<Pick<AdminUser, 'name' | 'email' | 'image' | 'emailVerified'>> & Record<string, unknown>
        ) => unwrap(admin().updateUser({ userId, data })),
        setRole: (userId: string, role: string) => unwrap(admin().setRole({ userId, role })),
        ban: (userId: string, banReason?: string, banExpiresIn?: number) =>
            unwrap(admin().banUser({ userId, banReason, banExpiresIn })),
        unban: (userId: string) => unwrap(admin().unbanUser({ userId })),
        setPassword: (userId: string, newPassword: string) => unwrap(admin().setUserPassword({ userId, newPassword })),
        /** Emails the user a link to choose a new password, through the app's own reset flow. */
        sendPasswordReset: (email: string, redirectTo?: string) =>
            unwrap(client().requestPasswordReset({ email, redirectTo })),
        revokeSession: (sessionToken: string) => unwrap(admin().revokeUserSession({ sessionToken })),
        revokeSessions: (userId: string) => unwrap(admin().revokeUserSessions({ userId })),
        remove: (userId: string) => unwrap(admin().removeUser({ userId })),
        /** Signs in as the user; the admin's own session is kept to return to. */
        impersonate: (userId: string) => unwrap(admin().impersonateUser({ userId })),
        stopImpersonating: () => unwrap(admin().stopImpersonating()),
        /** Emails an unverified user a new verification link, through the app's sendVerificationEmail. */
        sendVerification: (userId: string) =>
            $fetch(`${ADMIN_API}/users/${encodeURIComponent(userId)}/send-verification`, { method: 'POST' }).catch(
                fetchError
            ),
        /** Removes one sign-in method; the server refuses to remove a user's last one. */
        removeAccount: (userId: string, accountId: string) =>
            $fetch(`${ADMIN_API}/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}`, {
                method: 'DELETE'
            }).catch(fetchError)
    };
};
