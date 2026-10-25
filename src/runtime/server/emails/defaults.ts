import type { BetterAuthEmailName, BetterAuthEmails } from './types';

/** The plain-text emails sent when the app has no template for one. */
export const defaultEmails: {
    [Name in BetterAuthEmailName]: (data: BetterAuthEmails[Name]) => { subject: string; text: string };
} = {
    'verify-email': ({ user, url }) => ({
        subject: 'Verify your email address',
        text: `Hi ${user.name},\n\nConfirm your email address by opening this link:\n\n${url}\n\nIf you didn't create an account, you can ignore this email.`
    }),
    'reset-password': ({ user, url }) => ({
        subject: 'Reset your password',
        text: `Hi ${user.name},\n\nSomeone asked to reset your password. Choose a new one here:\n\n${url}\n\nIf it wasn't you, you can ignore this email; your password hasn't changed.`
    }),
    'change-email-confirmation': ({ user, newEmail, url }) => ({
        subject: 'Approve your email change',
        text: `Hi ${user.name},\n\nSomeone asked to change your account's email address to ${newEmail}. If it was you, approve it here:\n\n${url}\n\nIf it wasn't you, ignore this email; your email address stays the same.`
    }),
    'delete-account': ({ user, url }) => ({
        subject: 'Confirm deleting your account',
        text: `Hi ${user.name},\n\nOpen this link to permanently delete your account and everything in it:\n\n${url}\n\nIf you didn't ask for this, ignore this email; your account stays as it is.`
    }),
    'two-factor-code': ({ user, otp }) => ({
        subject: `Your sign-in code: ${otp}`,
        text: `Hi ${user.name},\n\nYour sign-in code is:\n\n${otp}\n\nIt expires in a few minutes. If you didn't just sign in, change your password: someone else knows it.`
    }),
    'existing-user-sign-up': ({ user }) => ({
        subject: 'Someone tried to sign up with your email',
        text: `Hi ${user.name},\n\nSomeone tried to create an account with your email address, but you already have one. If it was you, sign in instead, or reset your password if you've forgotten it.\n\nIf it wasn't you, you can ignore this email.`
    })
};
