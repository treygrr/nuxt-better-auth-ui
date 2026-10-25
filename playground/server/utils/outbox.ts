import type { EmailMessage } from '@treygrr/nuxt-better-auth-admin/emails';

/** Emails the playground "sends": logged, and kept for /api/_playground/outbox, so you can follow the links. */
export const outbox: Array<EmailMessage & { sentAt: string }> = [];
