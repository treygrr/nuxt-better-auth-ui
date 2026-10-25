import type { AdminAuditEntry } from '../types';
import { providerInfo } from './providers';

type Color = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';

/** How each recorded action is shown. Unknown actions show as recorded. */
export const AUDIT_ACTIONS: Record<string, { label: string; icon: string; color: Color }> = {
    'user.create': { label: 'Created user', icon: 'i-lucide-user-plus', color: 'success' },
    'user.update': { label: 'Edited user', icon: 'i-lucide-pencil', color: 'neutral' },
    'user.set-role': { label: 'Changed role', icon: 'i-lucide-shield', color: 'info' },
    'user.ban': { label: 'Banned', icon: 'i-lucide-ban', color: 'error' },
    'user.unban': { label: 'Unbanned', icon: 'i-lucide-shield-check', color: 'success' },
    'user.set-password': { label: 'Set password', icon: 'i-lucide-key-round', color: 'warning' },
    'user.send-verification': { label: 'Sent verification email', icon: 'i-lucide-mail-check', color: 'neutral' },
    'user.delete': { label: 'Deleted user', icon: 'i-lucide-trash', color: 'error' },
    'session.revoke': { label: 'Signed out a session', icon: 'i-lucide-log-out', color: 'neutral' },
    'session.revoke-all': { label: 'Signed out everywhere', icon: 'i-lucide-log-out', color: 'warning' },
    'user.impersonate': { label: 'Signed in as user', icon: 'i-lucide-venetian-mask', color: 'warning' },
    'user.stop-impersonating': { label: 'Stopped impersonating', icon: 'i-lucide-venetian-mask', color: 'neutral' },
    'account.remove': { label: 'Removed sign-in method', icon: 'i-lucide-unlink', color: 'warning' },
    // Users' own activity
    'auth.sign-up': { label: 'Signed up', icon: 'i-lucide-user-plus', color: 'success' },
    'auth.sign-in': { label: 'Signed in', icon: 'i-lucide-log-in', color: 'neutral' },
    'auth.sign-in-failed': { label: 'Failed sign-in', icon: 'i-lucide-shield-alert', color: 'warning' },
    'auth.sign-out': { label: 'Signed out', icon: 'i-lucide-log-out', color: 'neutral' },
    'auth.email-verified': { label: 'Verified email', icon: 'i-lucide-mail-check', color: 'success' },
    'auth.password-reset-requested': { label: 'Asked to reset password', icon: 'i-lucide-key-round', color: 'neutral' },
    'auth.password-changed': { label: 'Changed password', icon: 'i-lucide-key-round', color: 'info' }
};

export const auditAction = (action: string) =>
    AUDIT_ACTIONS[action] ?? { label: action, icon: 'i-lucide-history', color: 'neutral' as Color };

const FIELDS: Record<string, string> = { name: 'name', email: 'email', image: 'avatar', emailVerified: 'verification' };
const duration = (seconds: number) =>
    seconds % 86400 === 0
        ? `${seconds / 86400} day${seconds === 86400 ? '' : 's'}`
        : seconds % 3600 === 0
          ? `${seconds / 3600} hour${seconds === 3600 ? '' : 's'}`
          : `${seconds} seconds`;

/** A short description of an entry's details, eg "Role: admin" or "Reason: spam · for 7 days". */
export function auditDetails(entry: AdminAuditEntry): string {
    const details = entry.details ?? {};
    switch (entry.action) {
        case 'user.create':
        case 'user.set-role':
            return details.role ? `Role: ${details.role}` : '';
        case 'user.update': {
            const fields = (details.fields as string[] | undefined) ?? [];
            return fields.length ? `Changed ${fields.map((field) => FIELDS[field] ?? field).join(', ')}` : '';
        }
        case 'user.ban':
            return [
                details.reason ? `Reason: ${details.reason}` : 'No reason given',
                typeof details.expiresIn === 'number' && details.expiresIn > 0
                    ? `for ${duration(details.expiresIn)}`
                    : 'permanently'
            ].join(' · ');
        case 'auth.sign-in':
        case 'auth.sign-up':
            return details.method ? `With ${details.method}` : '';
        case 'auth.sign-in-failed':
            return details.reason ? String(details.reason).replaceAll('_', ' ').toLowerCase() : '';
        case 'account.remove':
            return details.providerId ? providerInfo(String(details.providerId)).label : '';
        default:
            return '';
    }
}
