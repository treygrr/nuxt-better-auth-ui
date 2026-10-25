import { smsOutbox } from '../../utils/sms-outbox';

/** The playground's sent texts, newest first. Development only: the playground isn't deployed. */
export default defineEventHandler(() => smsOutbox);
