import { linkedGuests } from '../../utils/linked-guests';

/** Guests who kept their account (the playground's onLinkAccount), newest first. Development only. */
export default defineEventHandler(() => linkedGuests);
