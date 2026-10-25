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
    /**
     * Configured social providers, eg ['github', 'google'], and the Generic OAuth plugin's `providerId`s: Better Auth
     * registers those as social providers too, signed in with and linked the same way.
     */
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
    /** Better Auth's Device Authorization plugin: signing in devices (TVs, CLIs) with a code. */
    deviceAuthorization: boolean;
    /** Better Auth's API Key plugin: API keys on the account page. */
    apiKey: boolean;
    /** Better Auth's Phone Number plugin: codes by text, this many digits long, and whether a new number signs up. */
    phoneNumber: { otpLength: number; signUp: boolean } | null;
    /** Better Auth's Organization plugin: whether users can create organizations (false only when the app said so). */
    organization: OrganizationCapabilities | null;
    /**
     * Better Auth's SSO plugin: whether domains are verified (and the TXT record's prefix), the base URL its callback
     * and SAML addresses hang off, and the app's own provider fields.
     */
    sso: {
        domainVerification: { enabled: boolean; tokenPrefix: string };
        baseURL: string;
        redirectURI: string | null;
        fields: OrganizationField[];
    } | null;
    /** Better Auth's Stripe plugin, with subscriptions: the billing tab. */
    stripe: boolean;
    /** Better Auth's Bearer plugin: session tokens in an Authorization header. */
    bearer: boolean;
    /** Better Auth's OAuth Popup plugin: provider sign-ins in a popup. */
    oauthPopup: boolean;
    /** Better Auth's JWT plugin: where services find the public keys that verify its tokens. */
    jwt: { jwksUrl: string } | null;
    /** Better Auth's Have I Been Pwned plugin: breached passwords are refused. */
    haveIBeenPwned: boolean;
    /** Better Auth's Last Login Method plugin: the sign-in page marks the method used last. */
    lastLoginMethod: boolean;
    /** Better Auth's Multi Session plugin: several accounts signed in at once, and a switcher. */
    multiSession: { maximumSessions: number } | null;
    /** Ids of the Better Auth plugins in use, eg ['admin', 'two-factor']. */
    plugins: string[];
};

/** One of the app's own fields on an organization table (the plugin's `schema.<model>.additionalFields`). */
export type OrganizationField = { name: string; type: string | string[]; required: boolean; editable: boolean };

/** What the Organization plugin offers, read from its options, whether the module or the app added it. */
export type OrganizationCapabilities = {
    /** Whether users can create organizations (false only when the app said so; a function decides per user). */
    allowCreate: boolean;
    /** The static roles: Better Auth's owner, admin and member, and the app's. */
    roles: string[];
    /** Each static role's permissions (when the app's set-up gives them), for the organization's roles tab. */
    rolePermissions: Record<string, Record<string, string[]>>;
    /** Every resource and its actions, for permission checks and the dynamic roles' permission grid. */
    statements: Record<string, string[]>;
    /** Owners and admins create their own roles (dynamic access control). */
    dynamicRoles: boolean;
    /** Teams within organizations. */
    teams: boolean;
    /** Organizations can be deleted (`disableOrganizationDeletion` isn't set). */
    deletion: boolean;
    /** The app's own fields on each table. */
    fields: Record<'organization' | 'member' | 'invitation' | 'team', OrganizationField[]>;
};

const DEFAULT_ORGANIZATION_STATEMENTS = {
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete']
};

type OrganizationOptions = {
    allowUserToCreateOrganization?: unknown;
    /** Better Auth's roles, made with its access control: each has its `statements`. */
    roles?: Record<string, { statements?: Record<string, readonly string[]> }>;
    ac?: { statements?: Record<string, readonly string[]> };
    dynamicAccessControl?: { enabled?: boolean };
    teams?: { enabled?: boolean };
    disableOrganizationDeletion?: boolean;
    schema?: Record<
        string,
        {
            additionalFields?: Record<
                string,
                { type: string | string[]; required?: boolean; input?: boolean; returned?: boolean }
            >;
        }
    >;
};

function organizationCapabilities(options: OrganizationOptions): OrganizationCapabilities {
    const fields = (model: string) =>
        Object.entries(options.schema?.[model]?.additionalFields ?? {})
            .filter(([, field]) => field.returned !== false)
            .map(([name, field]) => ({
                name,
                type: field.type,
                required: field.required === true,
                editable: field.input !== false
            }));
    return {
        allowCreate: options.allowUserToCreateOrganization !== false,
        roles: options.roles ? Object.keys(options.roles) : ['owner', 'admin', 'member'],
        rolePermissions: Object.fromEntries(
            Object.entries(options.roles ?? {}).map(([role, definition]) => [
                role,
                Object.fromEntries(
                    Object.entries(definition.statements ?? {})
                        .filter(([, actions]) => actions.length)
                        .map(([resource, actions]) => [resource, [...actions]])
                )
            ])
        ),
        statements: Object.fromEntries(
            Object.entries(options.ac?.statements ?? DEFAULT_ORGANIZATION_STATEMENTS).map(([resource, actions]) => [
                resource,
                [...actions]
            ])
        ),
        dynamicRoles: options.dynamicAccessControl?.enabled === true,
        teams: options.teams?.enabled === true,
        deletion: options.disableOrganizationDeletion !== true,
        fields: {
            organization: fields('organization'),
            member: fields('member'),
            invitation: fields('invitation'),
            team: fields('team')
        }
    };
}

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
export default defineEventHandler(async (event): Promise<AuthCapabilities> => {
    const auth = serverAuth(event) as unknown as { options: Options; $context: Promise<{ baseURL: string }> };
    const options = auth.options;
    const password = options.emailAndPassword ?? {};
    // The plugin keeps its options on itself, whether the module or the app added it.
    const twoFactor = options.plugins?.find((plugin) => plugin.id === 'two-factor');
    const twoFactorOptions = (twoFactor?.options ?? {}) as TwoFactorPluginOptions;
    const username = options.plugins?.find((plugin) => plugin.id === 'username');
    const usernameOptions = (username?.options ?? {}) as UsernamePluginOptions;
    const emailOtp = options.plugins?.find((plugin) => plugin.id === 'email-otp');
    const anonymous = options.plugins?.find((plugin) => plugin.id === 'anonymous');
    const phone = options.plugins?.find((plugin) => plugin.id === 'phone-number');
    const sso = options.plugins?.find((plugin) => plugin.id === 'sso');
    const multiSession = options.plugins?.find((plugin) => plugin.id === 'multi-session');
    const ssoOptions = (sso?.options ?? {}) as {
        domainVerification?: { enabled?: boolean; tokenPrefix?: string };
        redirectURI?: string;
        schema?: OrganizationOptions['schema'];
    };
    const genericOAuth = options.plugins?.find((plugin) => plugin.id === 'generic-oauth');
    const organization = options.plugins?.find((plugin) => plugin.id === 'organization');
    const jwt = options.plugins?.find((plugin) => plugin.id === 'jwt');
    // Better Auth's base URL includes its base path (eg /api/auth); its default JWKS path is /jwks.
    const jwksPath = (jwt?.options?.jwks as { jwksPath?: string } | undefined)?.jwksPath ?? '/jwks';
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
        socialProviders: [
            ...new Set([
                ...Object.keys(options.socialProviders ?? {}),
                ...((genericOAuth?.options?.config as Array<{ providerId: string }> | undefined) ?? []).map(
                    (config) => config.providerId
                )
            ])
        ],
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
        deviceAuthorization: has('device-authorization'),
        apiKey: has('api-key'),
        // Better Auth's default: 6 digits.
        phoneNumber: phone
            ? {
                  otpLength: (phone.options?.otpLength as number | undefined) || 6,
                  signUp: !!phone.options?.signUpOnVerification
              }
            : null,
        // A function decides per user, so the page offers creating and lets Better Auth refuse.
        organization: organization
            ? organizationCapabilities((organization.options ?? {}) as OrganizationOptions)
            : null,
        sso: sso
            ? {
                  domainVerification: {
                      enabled: ssoOptions.domainVerification?.enabled === true,
                      tokenPrefix: ssoOptions.domainVerification?.tokenPrefix ?? 'better-auth-token'
                  },
                  baseURL: (await auth.$context).baseURL,
                  redirectURI: ssoOptions.redirectURI ?? null,
                  fields: Object.entries(ssoOptions.schema?.ssoProvider?.additionalFields ?? {})
                      .filter(([, field]) => field.returned !== false)
                      .map(([name, field]) => ({
                          name,
                          type: field.type,
                          required: field.required === true,
                          editable: field.input !== false
                      }))
              }
            : null,
        stripe: has('stripe'),
        bearer: has('bearer'),
        oauthPopup: has('oauth-popup'),
        jwt: jwt ? { jwksUrl: `${(await auth.$context).baseURL}${jwksPath}` } : null,
        haveIBeenPwned: has('have-i-been-pwned'),
        lastLoginMethod: has('last-login-method'),
        // Better Auth's default: 5 accounts per browser.
        multiSession: multiSession
            ? { maximumSessions: (multiSession.options?.maximumSessions as number | undefined) || 5 }
            : null,
        plugins: (options.plugins ?? []).map((plugin) => plugin.id)
    };
});
