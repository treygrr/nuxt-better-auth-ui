import type { MessageKey, MessageParams } from '../i18n';
import type { AdminAuditEntry } from '../types';
import { providerInfo } from './providers';

type Color = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
/** useAuthI18n's `t`. */
type Translate = (key: MessageKey, params?: MessageParams) => string;

/** How each recorded action is shown: its label is a translation key. Unknown actions show as recorded. */
export const AUDIT_ACTIONS: Record<string, { label: MessageKey; icon: string; color: Color }> = {
    'user.create': { label: 'admin.audit.actions.userCreate', icon: 'i-lucide-user-plus', color: 'success' },
    'user.update': { label: 'admin.audit.actions.userUpdate', icon: 'i-lucide-pencil', color: 'neutral' },
    'user.set-role': { label: 'admin.audit.actions.userSetRole', icon: 'i-lucide-shield', color: 'info' },
    'user.ban': { label: 'admin.audit.actions.userBan', icon: 'i-lucide-ban', color: 'error' },
    'user.unban': { label: 'admin.audit.actions.userUnban', icon: 'i-lucide-shield-check', color: 'success' },
    'user.set-password': { label: 'admin.audit.actions.userSetPassword', icon: 'i-lucide-key-round', color: 'warning' },
    'user.send-verification': {
        label: 'admin.audit.actions.userSendVerification',
        icon: 'i-lucide-mail-check',
        color: 'neutral'
    },
    'user.delete': { label: 'admin.audit.actions.userDelete', icon: 'i-lucide-trash', color: 'error' },
    'session.revoke': { label: 'admin.audit.actions.sessionRevoke', icon: 'i-lucide-log-out', color: 'neutral' },
    'session.revoke-all': { label: 'admin.audit.actions.sessionRevokeAll', icon: 'i-lucide-log-out', color: 'warning' },
    'user.impersonate': {
        label: 'admin.audit.actions.userImpersonate',
        icon: 'i-lucide-venetian-mask',
        color: 'warning'
    },
    'user.stop-impersonating': {
        label: 'admin.audit.actions.userStopImpersonating',
        icon: 'i-lucide-venetian-mask',
        color: 'neutral'
    },
    'account.remove': { label: 'admin.audit.actions.accountRemove', icon: 'i-lucide-unlink', color: 'warning' },
    'user.two-factor-reset': {
        label: 'admin.audit.actions.userTwoFactorReset',
        icon: 'i-lucide-shield-off',
        color: 'warning'
    },
    'user.passkey-remove': {
        label: 'admin.audit.actions.userPasskeyRemove',
        icon: 'i-lucide-fingerprint',
        color: 'warning'
    },
    'user.note-add': { label: 'admin.audit.actions.userNoteAdd', icon: 'i-lucide-sticky-note', color: 'neutral' },
    'user.note-delete': {
        label: 'admin.audit.actions.userNoteDelete',
        icon: 'i-lucide-sticky-note',
        color: 'neutral'
    },
    // Users' own activity
    'auth.sign-up': { label: 'admin.audit.actions.authSignUp', icon: 'i-lucide-user-plus', color: 'success' },
    'auth.sign-in': { label: 'admin.audit.actions.authSignIn', icon: 'i-lucide-log-in', color: 'neutral' },
    'auth.sign-in-failed': {
        label: 'admin.audit.actions.authSignInFailed',
        icon: 'i-lucide-shield-alert',
        color: 'warning'
    },
    'auth.sign-out': { label: 'admin.audit.actions.authSignOut', icon: 'i-lucide-log-out', color: 'neutral' },
    'auth.email-verified': {
        label: 'admin.audit.actions.authEmailVerified',
        icon: 'i-lucide-mail-check',
        color: 'success'
    },
    'auth.password-reset-requested': {
        label: 'admin.audit.actions.authPasswordResetRequested',
        icon: 'i-lucide-key-round',
        color: 'neutral'
    },
    'auth.password-changed': {
        label: 'admin.audit.actions.authPasswordChanged',
        icon: 'i-lucide-key-round',
        color: 'info'
    }
};

/** An action in words, with its icon and colour. */
export const auditAction = (action: string, t: Translate) => {
    const known = AUDIT_ACTIONS[action];
    return known
        ? { ...known, label: t(known.label) }
        : { label: action, icon: 'i-lucide-history', color: 'neutral' as Color };
};

const FIELDS: Record<string, MessageKey> = {
    name: 'admin.audit.details.fields.name',
    email: 'admin.audit.details.fields.email',
    image: 'admin.audit.details.fields.image',
    emailVerified: 'admin.audit.details.fields.emailVerified'
};
const duration = (seconds: number, t: Translate) =>
    seconds % 86400 === 0
        ? t(seconds === 86400 ? 'admin.audit.details.days.one' : 'admin.audit.details.days.other', {
              count: seconds / 86400
          })
        : seconds % 3600 === 0
          ? t(seconds === 3600 ? 'admin.audit.details.hours.one' : 'admin.audit.details.hours.other', {
                count: seconds / 3600
            })
          : t('admin.audit.details.seconds', { count: seconds });

/** A short description of an entry's details, eg "Role: admin" or "Reason: spam · for 7 days". */
export function auditDetails(entry: AdminAuditEntry, t: Translate): string {
    const details = entry.details ?? {};
    switch (entry.action) {
        case 'user.create':
        case 'user.set-role':
            return details.role ? t('admin.audit.details.role', { role: String(details.role) }) : '';
        case 'user.update': {
            const fields = (details.fields as string[] | undefined) ?? [];
            return fields.length
                ? t('admin.audit.details.changed', {
                      fields: fields.map((field) => (FIELDS[field] ? t(FIELDS[field]) : field)).join(', ')
                  })
                : '';
        }
        case 'user.ban':
            return [
                details.reason
                    ? t('admin.audit.details.reason', { reason: String(details.reason) })
                    : t('admin.audit.details.noReason'),
                typeof details.expiresIn === 'number' && details.expiresIn > 0
                    ? t('admin.audit.details.for', { duration: duration(details.expiresIn, t) })
                    : t('admin.audit.details.permanently')
            ].join(' · ');
        case 'auth.sign-in':
        case 'auth.sign-up':
            return details.method ? t('admin.audit.details.with', { method: String(details.method) }) : '';
        case 'auth.sign-in-failed':
            return details.reason ? String(details.reason).replaceAll('_', ' ').toLowerCase() : '';
        case 'account.remove':
            return details.providerId ? providerInfo(String(details.providerId)).label : '';
        case 'user.passkey-remove':
            return details.name ? String(details.name) : '';
        default:
            return '';
    }
}
