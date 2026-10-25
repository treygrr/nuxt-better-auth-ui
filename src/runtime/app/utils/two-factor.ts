import { useAuthClientAction, type ActionHandleFor } from '@nuxtjs/better-auth/composables';

type Result<T> = { data: T | null; error: { message?: string; code?: string } | null };
type Verify = { code: string; trustDevice?: boolean };

/**
 * The app's typed auth client doesn't know about the Two-Factor plugin when the module adds it, so its methods
 * are described here (https://better-auth.com/docs/plugins/2fa).
 */
export type TwoFactorClient = {
    twoFactor: {
        enable(input: {
            password?: string;
            method?: 'totp' | 'otp';
        }): Promise<Result<{ method: 'totp'; totpURI: string; backupCodes: string[] } | { method: 'otp' }>>;
        disable(input: { password?: string }): Promise<Result<{ status: boolean }>>;
        generateBackupCodes(input: { password?: string }): Promise<Result<{ backupCodes: string[] }>>;
        verifyTotp(input: Verify): Promise<Result<unknown>>;
        sendOtp(input?: { trustDevice?: boolean }): Promise<Result<{ status: boolean }>>;
        verifyOtp(input: Verify): Promise<Result<unknown>>;
        verifyBackupCode(input: Verify): Promise<Result<unknown>>;
    };
};

type Methods = TwoFactorClient['twoFactor'];

/** An action handle for one of the Two-Factor plugin's client methods, eg `useTwoFactorAction('verifyTotp')`. */
export const useTwoFactorAction = <Name extends keyof Methods>(name: Name) =>
    useAuthClientAction(
        (client) => (client as unknown as TwoFactorClient).twoFactor[name] as (...args: unknown[]) => Promise<unknown>
    ) as unknown as ActionHandleFor<Methods[Name]>;

/** The secret in an otpauth:// URI, for typing into an authenticator app that can't scan the QR code. */
export const totpSecret = (uri: string) => new URL(uri).searchParams.get('secret') ?? '';
