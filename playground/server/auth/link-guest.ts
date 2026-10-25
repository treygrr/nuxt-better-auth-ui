import { linkedGuests } from '../utils/linked-guests';

// When a guest keeps their account by signing up or in (betterAuthUi.anonymous.onLinkAccount): an app would move
// the guest's data here (a cart, saved games, drafts) before Better Auth deletes the guest account.
export default async ({
    anonymousUser,
    newUser
}: {
    anonymousUser: { user: { id: string } };
    newUser: { user: { id: string } };
}) => {
    linkedGuests.unshift({ from: anonymousUser.user.id, to: newUser.user.id });
    linkedGuests.length = Math.min(linkedGuests.length, 50);
    console.info(`[playground] guest ${anonymousUser.user.id} kept their account as ${newUser.user.id}`);
};
