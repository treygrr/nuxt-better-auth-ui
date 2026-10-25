import { outbox } from '../../utils/outbox';

/** The playground's sent emails, newest first. Development only: the playground isn't deployed. */
export default defineEventHandler(() => outbox);
