export interface Stat {
    title: string;
    icon: string;
    value: number | string;
    /** Change against the previous period, in percent; absent when there's nothing to compare. */
    variation?: number;
    to?: string;
}

/** The admin home page's numbers, from the module's stats route. */
export interface AdminStats {
    users: number;
    newUsers: number;
    previousNewUsers: number;
    banned: number;
    /** Null when sessions live only in secondary storage, where they can't be counted. */
    sessions: number | null;
    /** Users active within the activity interval; null without activity tracking. */
    online: number | null;
    series: Array<{ date: string; signUps: number }>;
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
    /** With the Two-Factor plugin. */
    twoFactorEnabled?: boolean | null;
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

/** An entry in the audit log. Names and emails are as they were at the time. */
export interface AdminAuditEntry {
    id: string;
    action: string;
    actorId: string;
    actorEmail: string;
    actorName: string;
    targetId: string | null;
    targetEmail: string | null;
    targetName: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}
