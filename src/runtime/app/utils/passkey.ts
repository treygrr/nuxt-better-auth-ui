import { useAuthClientAction, type ActionHandleFor } from '@nuxtjs/better-auth/composables';

type Result<T> = { data: T | null; error: { message?: string; code?: string } | null };

/** A passkey as Better Auth's list-user-passkeys returns it (no key material). */
export type Passkey = {
    id: string;
    name?: string | null;
    deviceType: string;
    backedUp: boolean;
    createdAt: string;
};

/**
 * The app's typed auth client doesn't know about the Passkey plugin when the module adds it, so its methods are
 * described here (https://better-auth.com/docs/plugins/passkey).
 */
export type PasskeyClient = {
    signIn: {
        passkey(input?: { autoFill?: boolean }): Promise<Result<unknown>>;
    };
    passkey: {
        addPasskey(input?: { name?: string }): Promise<Result<Passkey>>;
        updatePasskey(input: { id: string; name: string }): Promise<Result<{ passkey: Passkey }>>;
        deletePasskey(input: { id: string }): Promise<Result<{ status: boolean }>>;
    };
};

type Methods = PasskeyClient['passkey'];

/** An action handle for one of the Passkey plugin's client methods, eg `usePasskeyAction('addPasskey')`. */
export const usePasskeyAction = <Name extends keyof Methods>(name: Name) =>
    useAuthClientAction(
        (client) => (client as unknown as PasskeyClient).passkey[name] as (...args: unknown[]) => Promise<unknown>
    ) as unknown as ActionHandleFor<Methods[Name]>;

type PasskeyError = { message?: string; code?: string } | null | undefined;

/**
 * Error codes for a passkey prompt that was closed or timed out. Browsers report both the same way, on purpose
 * (https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client), as a NotAllowedError that SimpleWebAuthn
 * passes through.
 */
const CANCELLED = new Set(['ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY', 'ERROR_CEREMONY_ABORTED', 'AUTH_CANCELLED']);

/** Whether the passkey prompt was closed (or timed out) rather than something going wrong. */
export const passkeyCancelled = (error: PasskeyError) => !!error?.code && CANCELLED.has(error.code);

/** What to tell someone whose passkey couldn't be added, in words rather than the browser's. */
export const passkeyAddError = (error: PasskeyError) => {
    if (!error) return null;
    if (passkeyCancelled(error)) return 'No passkey was added: the prompt was closed or timed out.';
    if (error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
        return 'That device or password manager already has a passkey for your account.';
    }
    return error.message ?? "Couldn't add the passkey.";
};

/** Whether this browser can use passkeys at all. */
export const passkeysSupported = () => typeof window !== 'undefined' && 'PublicKeyCredential' in window;
