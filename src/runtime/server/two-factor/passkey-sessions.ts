// Shared by the Better Auth plugin and the server routes, so no Nuxt, Nitro or Better Auth imports here.
import { needsTwoFactorSetUp, type TwoFactorRequired } from '../../two-factor-required';

/**
 * Sessions started with a passkey are complete on their own: a passkey is the device plus the person's fingerprint,
 * face or PIN. Better Auth doesn't record how a session started, so the module notes passkey sessions in its
 * verification table, the way the Two-Factor plugin keeps trusted devices: no new table, and each note expires
 * with its session.
 */
type Verifications = {
    createVerificationValue(data: { identifier: string; value: string; expiresAt: Date }): Promise<unknown>;
    findVerificationValue(identifier: string): Promise<{ value: string; expiresAt: Date | string } | null>;
};
type Session = { id: string; userId: string; expiresAt: Date | string };

const key = (sessionId: string) => `better-auth-ui-passkey-session-${sessionId}`;

/** Notes that this session was started with a passkey. */
export const notePasskeySession = (verifications: Verifications, session: Session) =>
    verifications.createVerificationValue({
        identifier: key(session.id),
        value: session.userId,
        expiresAt: new Date(session.expiresAt)
    });

/** Whether this session was started with a passkey. */
export async function signedInWithPasskey(verifications: Verifications, session: Pick<Session, 'id' | 'userId'>) {
    const note = await verifications.findVerificationValue(key(session.id));
    return !!note && note.value === session.userId && new Date(note.expiresAt) > new Date();
}

/**
 * Whether a session's user must still set up two-factor before using the app: they must have it on, haven't, and
 * didn't sign in with a passkey. Looks the note up only for those users, so other requests cost nothing extra.
 */
export async function mustSetUpTwoFactor(
    verifications: Verifications,
    session: { session: Pick<Session, 'id' | 'userId'>; user: Parameters<typeof needsTwoFactorSetUp>[0] },
    required: TwoFactorRequired
) {
    if (!needsTwoFactorSetUp(session.user, required)) return false;
    return !(await signedInWithPasskey(verifications, session.session));
}
