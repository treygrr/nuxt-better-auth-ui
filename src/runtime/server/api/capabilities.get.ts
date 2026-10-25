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
    /** Better Auth's Username plugin: a username at sign-up, signing in with it, changing it (unless immutable). */
    username: { minLength: number; maxLength: number; immutable: boolean } | null;
    /** Better Auth's Magic Link plugin: signing in with a link by email. */
    magicLink: boolean;
    /** Better Auth's Email OTP plugin: signing in with a code by email, this many digits long. */
    emailOtp: { otpLength: number } | null;
    /** Better Auth's Anonymous plugin: guest accounts, and whether guests can delete theirs. */
    anonymous: { deleteAccount: boolean } | null;
    /** Better Auth's Have I Been Pwned plugin: breached passwords are refused. */
    haveIBeenPwned: boolean;
    /** Better Auth's Last Login Method plugin: the sign-in page marks the method used last. */
    lastLoginMethod: boolean;
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
type UsernamePluginOptions = { minUsernameLength?: number; maxUsernameLength?: number; immutableUsername?: boolean };

/** Public: it says which features are on, nothing about users. Defaults are Better Auth's documented ones. */
export default defineEventHandler((event): AuthCapabilities => {
    const options = (serverAuth(event) as unknown as { options: Options }).options;
    const password = options.emailAndPassword ?? {};
    // The plugin keeps its options on itself, whether the module or the app added it.
    const twoFactor = options.plugins?.find((plugin) => plugin.id === 'two-factor');
    const twoFactorOptions = (twoFactor?.options ?? {}) as TwoFactorPluginOptions;
    const username = options.plugins?.find((plugin) => plugin.id === 'username');
    const usernameOptions = (username?.options ?? {}) as UsernamePluginOptions;
    const emailOtp = options.plugins?.find((plugin) => plugin.id === 'email-otp');
    const anonymous = options.plugins?.find((plugin) => plugin.id === 'anonymous');
    const has = (id: string) => !!options.plugins?.some((plugin) => plugin.id === id);
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
        passkey: has('passkey'),
        // Better Auth's defaults: 3 to 30 characters.
        username: username
            ? {
                  minLength: usernameOptions.minUsernameLength || 3,
                  maxLength: usernameOptions.maxUsernameLength || 30,
                  immutable: usernameOptions.immutableUsername === true
              }
            : null,
        magicLink: has('magic-link'),
        // Better Auth's default: 6 digits.
        emailOtp: emailOtp ? { otpLength: (emailOtp.options?.otpLength as number | undefined) || 6 } : null,
        anonymous: anonymous ? { deleteAccount: anonymous.options?.disableDeleteAnonymousUser !== true } : null,
        haveIBeenPwned: has('have-i-been-pwned'),
        lastLoginMethod: has('last-login-method'),
        plugins: (options.plugins ?? []).map((plugin) => plugin.id)
    };
});
