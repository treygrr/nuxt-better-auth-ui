import { devOnly } from '../../utils/dev-only';
import { linkedGuests } from '../../utils/linked-guests';

/** Guests who kept their account (the playground's onLinkAccount), newest first. Development and tests only. */
export default defineEventHandler(() => {
    devOnly();
    return linkedGuests;
});
