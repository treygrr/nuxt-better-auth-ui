import { devOnly } from '../../utils/dev-only';
import { smsOutbox } from '../../utils/sms-outbox';

/** The playground's sent texts, newest first. Development and tests only. */
export default defineEventHandler(() => {
    devOnly();
    return smsOutbox;
});
