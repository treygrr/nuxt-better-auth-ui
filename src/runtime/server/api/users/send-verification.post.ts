import {
    createError,
    defineEventHandler,
    getRequestHeader,
    getRequestIP,
    getRouterParam,
    useRuntimeConfig
} from '#imports';

import { writeAuditEntry, type AuditPerson } from '../../audit/plugin';
import { requireAdminPermission, requireUser } from '../../utils/admin';

type AuthWithVerification = { api: { sendVerificationEmail(input: { body: { email: string } }): Promise<unknown> } };

/**
 * Emails a user a new verification link, through the app's own `sendVerificationEmail`. Better Auth's
 * send-verification-email endpoint only sends to the caller's own address when they're signed in, so this calls
 * it on the server without the admin's session (https://better-auth.com/docs/concepts/email#3-manually).
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const user = (await requireUser(context, getRouterParam(event, 'id'))) as AuditPerson & { emailVerified?: boolean };
    if (user.emailVerified) throw createError({ statusCode: 400, statusMessage: 'Their email is already verified' });

    await (auth as unknown as AuthWithVerification).api.sendVerificationEmail({ body: { email: user.email } });

    const config = (
        useRuntimeConfig().public.betterAuthUi as { admin: { auditLog: boolean; auditLogRetentionDays: number } }
    ).admin;
    if (config.auditLog) {
        await writeAuditEntry(
            context as never,
            {
                action: 'user.send-verification',
                actor: admin as AuditPerson,
                target: user,
                ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
                userAgent: getRequestHeader(event, 'user-agent') ?? null
            },
            config.auditLogRetentionDays
        );
    }
    return { sent: true };
});
