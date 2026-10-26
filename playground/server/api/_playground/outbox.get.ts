import { devOnly } from '../../utils/dev-only';
import { outbox } from '../../utils/outbox';

/** The playground's sent emails, newest first. Development and tests only. */
export default defineEventHandler(() => {
    devOnly();
    return outbox;
});
