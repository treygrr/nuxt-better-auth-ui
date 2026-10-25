import type { SmsMessage } from '@treygrr/nuxt-better-auth-ui/sms';

/** Texts the playground "sends": logged, and kept for /api/_playground/sms, so you can read the codes. */
export const smsOutbox: Array<SmsMessage & { sentAt: string }> = [];
