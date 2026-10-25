import { describe, expect, it } from 'vitest';

import {
    mustSetUpTwoFactor,
    notePasskeySession,
    signedInWithPasskey
} from '../src/runtime/server/two-factor/passkey-sessions';

/** Better Auth's verification table, in memory. */
const verifications = () => {
    const rows = new Map<string, { value: string; expiresAt: Date }>();
    return {
        rows,
        createVerificationValue: async ({
            identifier,
            ...row
        }: {
            identifier: string;
            value: string;
            expiresAt: Date;
        }) => rows.set(identifier, row),
        findVerificationValue: async (identifier: string) => rows.get(identifier) ?? null
    };
};
const tomorrow = new Date(Date.now() + 86_400_000);
const moderator = { role: 'moderator', twoFactorEnabled: false };

describe('passkey sessions and required two-factor', () => {
    it('notes a passkey session, for its own user, until it expires', async () => {
        const store = verifications();
        await notePasskeySession(store, { id: 's1', userId: 'u1', expiresAt: tomorrow });
        expect(await signedInWithPasskey(store, { id: 's1', userId: 'u1' })).toBe(true);
        expect(await signedInWithPasskey(store, { id: 's2', userId: 'u1' })).toBe(false);
        expect(await signedInWithPasskey(store, { id: 's1', userId: 'someone-else' })).toBe(false);

        await notePasskeySession(store, { id: 'old', userId: 'u1', expiresAt: new Date(Date.now() - 1000) });
        expect(await signedInWithPasskey(store, { id: 'old', userId: 'u1' })).toBe(false);
    });

    it('lets a required user without two-factor in after a passkey, not after a password', async () => {
        const store = verifications();
        await notePasskeySession(store, { id: 'passkey', userId: 'u1', expiresAt: tomorrow });
        const required = ['moderator'];
        expect(
            await mustSetUpTwoFactor(store, { session: { id: 'passkey', userId: 'u1' }, user: moderator }, required)
        ).toBe(false);
        expect(
            await mustSetUpTwoFactor(store, { session: { id: 'password', userId: 'u1' }, user: moderator }, required)
        ).toBe(true);
    });

    it("doesn't look anything up for users it doesn't apply to", async () => {
        const store = verifications();
        const lookups: string[] = [];
        const counting = { ...store, findVerificationValue: async (id: string) => (lookups.push(id), null) };
        const session = { id: 's', userId: 'u' };
        expect(await mustSetUpTwoFactor(counting, { session, user: { role: 'user' } }, ['moderator'])).toBe(false);
        expect(
            await mustSetUpTwoFactor(counting, { session, user: { role: 'moderator', twoFactorEnabled: true } }, [
                'moderator'
            ])
        ).toBe(false);
        expect(lookups).toEqual([]);
    });
});
