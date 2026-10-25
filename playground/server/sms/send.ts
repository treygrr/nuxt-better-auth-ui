import { defineBetterAuthSmsSender } from '@treygrr/nuxt-better-auth-ui/sms';

import { smsOutbox } from '../utils/sms-outbox';

// The playground's text delivery: no SMS service, just the console and an in-memory outbox.
// An app would call Twilio, Vonage, AWS SNS, … here.
export default defineBetterAuthSmsSender(async (message) => {
    smsOutbox.unshift({ ...message, sentAt: new Date().toISOString() });
    smsOutbox.length = Math.min(smsOutbox.length, 50);
    console.info(`[playground] text to ${message.to}: ${message.text}`);
});
