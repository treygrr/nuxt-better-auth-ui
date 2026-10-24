import type { AvatarProps } from '@nuxt/ui';

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced';
export type SaleStatus = 'paid' | 'failed' | 'refunded';

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: AvatarProps;
    status: UserStatus;
    location: string;
}

export interface Mail {
    id: number;
    unread?: boolean;
    from: User;
    subject: string;
    body: string;
    date: string;
}

export interface Member {
    name: string;
    username: string;
    role: 'member' | 'owner';
    avatar: AvatarProps;
}

export interface Stat {
    title: string;
    icon: string;
    value: number | string;
    variation: number;
    formatter?: (value: number) => string;
}

export interface Sale {
    id: string;
    date: string;
    status: SaleStatus;
    email: string;
    amount: number;
}

export interface Notification {
    id: number;
    unread?: boolean;
    sender: User;
    body: string;
    date: string;
}

export type Period = 'daily' | 'weekly' | 'monthly';

export interface Range {
    start: Date;
    end: Date;
}

/** A user as Better Auth's Admin plugin returns it. */
export interface AdminUser {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: string | Date | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

/** A session as Better Auth's Admin plugin returns it. */
export interface AdminSession {
    id: string;
    token: string;
    userId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    impersonatedBy?: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    expiresAt: string | Date;
}

/** One page of users, and what to show. */
export interface AdminUserQuery {
    limit: number;
    offset: number;
    search?: string;
    searchField?: 'email' | 'name';
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    /** One filter at a time, as Better Auth's list-users supports. */
    filter?: { field: 'role' | 'banned' | 'emailVerified'; value: string };
}

/** A linked sign-in method, as the module's accounts route returns it (no passwords or tokens). */
export interface AdminAccount {
    id: string;
    /** `credential` for email and password, otherwise the OAuth provider, eg `google`. */
    providerId: string;
    accountId: string;
    scope: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}
