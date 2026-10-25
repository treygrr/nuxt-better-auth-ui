import { defineBetterAuthEmailSender } from '@treygrr/nuxt-better-auth-admin/emails';

import { outbox } from '../utils/outbox';

// The playground's email delivery: no mail service, just the console and an in-memory outbox.
// An app would call Resend, SMTP, … here.
export default defineBetterAuthEmailSender(async (message) => {
    outbox.unshift({ ...message, sentAt: new Date().toISOString() });
    outbox.length = Math.min(outbox.length, 50);
    console.info(`[playground] "${message.subject}" to ${message.to}\n${message.text}`);
});
