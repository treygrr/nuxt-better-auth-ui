import { createError, defineEventHandler, getRouterParam } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';

type AuthWithVerification = { api: { sendVerificationEmail(input: { body: { email: string } }): Promise<unknown> } };

/**
 * Emails a user a new verification link, through the app's own `sendVerificationEmail`. Better Auth's
 * send-verification-email endpoint only sends to the caller's own address when they're signed in, so this calls
 * it on the server without the admin's session (https://better-auth.com/docs/concepts/email#3-manually).
 */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const user = (await requireUser(context, getRouterParam(event, 'id'))) as AuditPerson & { emailVerified?: boolean };
    if (user.emailVerified) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Their email is already verified',
            data: { code: 'EMAIL_ALREADY_VERIFIED' }
        });
    }

    await (auth as unknown as AuthWithVerification).api.sendVerificationEmail({ body: { email: user.email } });
    await recordAdminAction(event, context, {
        action: 'user.send-verification',
        actor: admin as AuditPerson,
        target: user
    });
    return { sent: true };
});
