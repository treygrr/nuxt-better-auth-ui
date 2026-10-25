import { defineEventHandler, serverAuth } from '#imports';

/** What the app's Better Auth set-up offers, so the sign-in and account pages show only what works. */
export type AuthCapabilities = {
    /** Better Auth's `appName` (its default: "Better Auth"). */
    appName: string;
    emailAndPassword: boolean;
    signUp: boolean;
    requireEmailVerification: boolean;
    minPasswordLength: number;
    maxPasswordLength: number;
    /** Password reset emails (`emailAndPassword.sendResetPassword`). */
    resetPassword: boolean;
    /** Verification emails (`emailVerification.sendVerificationEmail`). */
    emailVerification: boolean;
    /** Configured social providers, eg ['github', 'google']. */
    socialProviders: string[];
    /** `user.changeEmail.enabled`, and whether a change is approved from the current (verified) address first. */
    changeEmail: boolean;
    changeEmailConfirmation: boolean;
    /** `user.deleteUser.enabled`, and whether it confirms by email. */
    deleteUser: boolean;
    deleteUserByEmail: boolean;
    /**
     * Better Auth's Two-Factor plugin, when the app uses it: whether codes can come by email, and whether users
     * without a password can turn it on (`allowPasswordless`).
     */
    twoFactor: { otp: boolean; allowPasswordless: boolean } | null;
    /** Better Auth's Passkey plugin: signing in with a passkey, and adding them from the account page. */
    passkey: boolean;
    /** Ids of the Better Auth plugins in use, eg ['admin', 'two-factor']. */
    plugins: string[];
};

type Options = {
    appName?: string;
    emailAndPassword?: {
        enabled?: boolean;
        disableSignUp?: boolean;
        requireEmailVerification?: boolean;
        minPasswordLength?: number;
        maxPasswordLength?: number;
        sendResetPassword?: unknown;
    };
    emailVerification?: { sendVerificationEmail?: unknown };
    socialProviders?: Record<string, unknown>;
    user?: {
        changeEmail?: { enabled?: boolean; sendChangeEmailConfirmation?: unknown };
        deleteUser?: { enabled?: boolean; sendDeleteAccountVerification?: unknown };
    };
    plugins?: Array<{ id: string; options?: Record<string, unknown> }>;
};

type TwoFactorPluginOptions = { otpOptions?: { sendOTP?: unknown }; allowPasswordless?: boolean };

/** Public: it says which features are on, nothing about users. Defaults are Better Auth's documented ones. */
export default defineEventHandler((event): AuthCapabilities => {
    const options = (serverAuth(event) as unknown as { options: Options }).options;
    const password = options.emailAndPassword ?? {};
    // The plugin keeps its options on itself, whether the module or the app added it.
    const twoFactor = options.plugins?.find((plugin) => plugin.id === 'two-factor');
    const twoFactorOptions = (twoFactor?.options ?? {}) as TwoFactorPluginOptions;
    return {
        appName: options.appName || 'Better Auth',
        emailAndPassword: password.enabled === true,
        signUp: password.enabled === true && password.disableSignUp !== true,
        requireEmailVerification: password.requireEmailVerification === true,
        minPasswordLength: password.minPasswordLength ?? 8,
        maxPasswordLength: password.maxPasswordLength ?? 128,
        resetPassword: typeof password.sendResetPassword === 'function',
        emailVerification: typeof options.emailVerification?.sendVerificationEmail === 'function',
        socialProviders: Object.keys(options.socialProviders ?? {}),
        changeEmail: options.user?.changeEmail?.enabled === true,
        changeEmailConfirmation: typeof options.user?.changeEmail?.sendChangeEmailConfirmation === 'function',
        deleteUser: options.user?.deleteUser?.enabled === true,
        deleteUserByEmail: typeof options.user?.deleteUser?.sendDeleteAccountVerification === 'function',
        twoFactor: twoFactor
            ? {
                  otp: typeof twoFactorOptions.otpOptions?.sendOTP === 'function',
                  allowPasswordless: twoFactorOptions.allowPasswordless === true
              }
            : null,
        passkey: !!options.plugins?.some((plugin) => plugin.id === 'passkey'),
        plugins: (options.plugins ?? []).map((plugin) => plugin.id)
    };
});
