import { existsSync } from 'node:fs';

import type { NuxtPage } from '@nuxt/schema';

import { resolveRoles, rolesFile, rolesTypes, type AdminRolePermissions } from './roles';
import { EMAIL_NAMES, type BetterAuthEmailName } from './runtime/server/emails/types';
import type { SecurityAlerts } from './runtime/server/alerts/plugin';
import type { BetterAuthAdminPublicConfig } from './runtime/app/utils/config';
import { ADMIN_API, UI_API } from './runtime/constants';
import { safeLocalPath } from './runtime/app/utils/redirect';
import {
    addComponentsDir,
    addImports,
    addServerHandler,
    addLayout,
    addRouteMiddleware,
    addTemplate,
    createResolver,
    defineNuxtModule,
    extendPages,
    extendRouteRules,
    resolvePath,
    tryResolveModule,
    useLogger
} from '@nuxt/kit';

export type { AdminRolePermissions };

/** The admin dashboard's options. */
export type AdminOptions = {
    /**
     * The admin dashboard. Off, none of its pages, routes or Better Auth plugins are added.
     * @default true
     */
    enabled: boolean;
    /**
     * Where the admin pages live, eg `/admin/users`.
     * @default '/admin'
     */
    route: string;
    /**
     * The role that can do everything in the admin pages and Better Auth's admin endpoints.
     * @default 'admin'
     */
    role: string;
    /**
     * More roles, with the Better Auth Admin permissions each grants. Roles that can list users open the admin
     * pages, which show only the actions their role allows; Better Auth enforces the same permissions.
     * @example { moderator: { user: ['list', 'get', 'ban'], session: ['list', 'revoke'] } }
     * @default {}
     */
    roles: Record<string, AdminRolePermissions>;
    /**
     * Better Auth Admin plugin options, passed through as documented
     * (https://better-auth.com/docs/plugins/admin#options).
     */
    /** The role new users get. Must be `user`, the admin role, or one of `roles`. @default 'user' */
    defaultRole?: string;
    /** The ban reason when an admin gives none. Better Auth's default: "No reason". */
    defaultBanReason?: string;
    /** Seconds a ban lasts when an admin gives no length. Better Auth's default: forever. */
    defaultBanExpiresIn?: number;
    /** What banned users see when they try to sign in. */
    bannedUserMessage?: string;
    /** Seconds an impersonation session lasts. Better Auth's default: 3600 (an hour). */
    impersonationSessionDuration?: number;
    /**
     * Let admins sign in as a user from their page, through Better Auth's impersonation. Off, Better Auth's
     * impersonate-user endpoint is refused too. Apps showing the banner add `<AdminImpersonationBanner />`.
     * @default false
     */
    impersonation: boolean;
    /**
     * Record admin actions (bans, role changes, deletions, impersonation, …) in an `adminAuditLog` table,
     * created by Better Auth's migrations, and show them in the admin pages.
     * @default true
     */
    auditLog: boolean;
    /**
     * How many days the audit log keeps entries; older ones are deleted. 0 keeps them forever.
     * @default 30
     */
    auditLogRetentionDays: number;
    /**
     * Opt-in "last active" and "online now": records when each signed-in user was last active (their page loads)
     * in an `adminUserActivity` table, at most once per user per `updateInterval` (ms) on each server, so about
     * one write per signed-in user per interval. Like Better Auth's dashboard activity tracking, off by default.
     * @default { enabled: false, updateInterval: 300000 }
     */
    activityTracking: { enabled: boolean; updateInterval?: number };
    /**
     * Also record users' own sign-ins (any method), failed sign-ins, sign-outs, password resets and changes, and
     * email verification in the audit log. One write per event.
     * @default true
     */
    auditUserEvents: boolean;
    /**
     * Private staff notes on each user's admin page ("Warned for spam in chat"), in an `adminUserNote` table
     * created by Better Auth's migrations. Staff who can view a user read them; those who can update a user add
     * them and delete their own; those who can delete users delete anyone's. Audit-logged.
     * @default false
     */
    notes: boolean;
};

/** Where the sign-in and account pages go; false to leave one out (eg the app has its own). */
export type PagesOptions = {
    /** @default '/login' (@nuxtjs/better-auth sends signed-out users here by default) */
    signIn: string | false;
    /** @default '/signup' */
    signUp: string | false;
    /** @default '/forgot-password' */
    forgotPassword: string | false;
    /** Where password reset links land. @default '/reset-password' */
    resetPassword: string | false;
    /** The signed-in user's account page: profile, email, password, sign-in methods, devices, deleting it. @default '/account' */
    account: string | false;
    /** The second step of signing in with a password, for users with two-factor on (see `twoFactor`). @default '/two-factor' */
    twoFactor: string | false;
};

/** Two-factor authentication, through Better Auth's Two-Factor plugin (https://better-auth.com/docs/plugins/2fa). */
export type TwoFactorOptions = {
    /**
     * Adds the plugin, so users can turn on two-factor from their account page and are asked for a code after
     * signing in, with a password or without (social, magic links, …). Users without a password can turn it on too
     * (the plugin's `allowPasswordless`). The plugin adds a `twoFactorEnabled` column to the user table and a
     * `twoFactor` table: run Better Auth's migrations after turning it on.
     * @default false
     */
    enabled: boolean;
    /**
     * Users who must have two-factor on: `true` for everyone, or roles, eg `['admin', 'moderator']`. Until they set
     * it up, pages send them to the account page, and the app's `/api` routes and Better Auth's admin endpoints
     * answer 403; once it's on, they can't turn it off.
     * @default false
     */
    required: boolean | string[];
    /**
     * Codes by email as well as authenticator apps (the plugin's `otpOptions.sendOTP`), sent through
     * `emails.send` with the `two-factor-code` template.
     * @default false
     */
    otp: boolean;
    /** The name authenticator apps show. Better Auth's default: the app name in the auth config. */
    issuer?: string;
    /** Seconds "trust this device" lasts. Better Auth's default: 2592000 (30 days). */
    trustDeviceMaxAge?: number;
};

/** Passkeys, through Better Auth's Passkey plugin (https://better-auth.com/docs/plugins/passkey). */
export type PasskeyOptions = {
    /**
     * Adds the plugin (install `@better-auth/passkey`), so users can add passkeys from their account page and sign
     * in with one. It adds a `passkey` table: run Better Auth's migrations after turning it on.
     * @default false
     */
    enabled: boolean;
    /** The site name passkey prompts show. Better Auth's default: the app name in the auth config. */
    rpName?: string;
    /** The domain passkeys belong to, eg `example.com`. Better Auth's default: the hostname of its base URL. */
    rpID?: string;
    /** The origin passkeys are used from, eg `https://example.com`. Better Auth's default: the request's origin. */
    origin?: string;
};

/** Usernames, through Better Auth's Username plugin (https://better-auth.com/docs/plugins/username). */
export type UsernameOptions = {
    /**
     * Adds the plugin: a username at sign-up, signing in with it or the email, and changing it on the account page.
     * It adds `username` and `displayUsername` columns to the user table: run Better Auth's migrations.
     * @default false
     */
    enabled: boolean;
    /** Better Auth's defaults: 3 and 30. */
    minLength?: number;
    maxLength?: number;
    /** Usernames can be set once, then not changed. @default false */
    immutable?: boolean;
};

/** Magic links, through Better Auth's Magic Link plugin (https://better-auth.com/docs/plugins/magic-link). */
export type MagicLinkOptions = {
    /**
     * Adds the plugin: "Email me a sign-in link" on the sign-in page, sent through `emails.send` with the
     * `magic-link` template. Needs no migration.
     * @default false
     */
    enabled: boolean;
    /** Seconds a link lasts. Better Auth's default: 300 (5 minutes). */
    expiresIn?: number;
    /** Links only sign existing users in; they don't create accounts. Better Auth's default: false. */
    disableSignUp?: boolean;
};

/** Sign-in codes by email, through Better Auth's Email OTP plugin (https://better-auth.com/docs/plugins/email-otp). */
export type EmailOtpOptions = {
    /**
     * Adds the plugin: "Email me a code" on the sign-in page, sent through `emails.send` with the `email-code`
     * template. Needs no migration.
     * @default false
     */
    enabled: boolean;
    /** Digits in a code. Better Auth's default: 6. */
    otpLength?: number;
    /** Seconds a code lasts. Better Auth's default: 300 (5 minutes). */
    expiresIn?: number;
    /** Wrong tries before a code stops working. Better Auth's default: 3. */
    allowedAttempts?: number;
    /** Codes only sign existing users in; they don't create accounts. Better Auth's default: false. */
    disableSignUp?: boolean;
};

/** Guest accounts, through Better Auth's Anonymous plugin (https://better-auth.com/docs/plugins/anonymous). */
export type AnonymousOptions = {
    /**
     * Adds the plugin: "Continue as a guest" on the sign-in page, an account with no email or password. Guests keep
     * their account by signing up or signing in another way, from the sign-in pages (which then let guests in) or
     * their account page; Better Auth then moves them to that account and deletes the guest one. Adds an
     * `isAnonymous` column to the user table: run Better Auth's migrations.
     * @default false
     */
    enabled: boolean;
    /** The domain of guests' generated email addresses. Better Auth's default: `anonymous.placeholder.invalid`. */
    emailDomainName?: string;
    /** Guests can't delete their own guest account, and it's kept when they link a real one. Better Auth's default: false. */
    disableDeleteAnonymousUser?: boolean;
    /**
     * A file whose default export moves a guest's data to the account they sign up or in with: Better Auth's
     * `onLinkAccount`, eg `async ({ anonymousUser, newUser }) => { … }`, `./server/auth/link-guest.ts`. Relative to
     * the project root; Nuxt aliases work too.
     */
    onLinkAccount?: string;
};

/** Bot protection, through Better Auth's Captcha plugin (https://better-auth.com/docs/plugins/captcha). */
export type CaptchaOptions = {
    provider: 'cloudflare-turnstile' | 'hcaptcha' | 'google-recaptcha';
    /** The provider's site key (public). The secret key is read from `BETTER_AUTH_CAPTCHA_SECRET_KEY` at runtime. */
    siteKey: string;
    /**
     * The Better Auth paths it guards. Default: signing up, and asking for a magic link (which can create an
     * account too). Better Auth's own default also guards signing in and password resets.
     */
    endpoints?: string[];
};

export type ModuleOptions = {
    /** The admin dashboard for managing users (`/admin`). */
    admin: AdminOptions;
    /**
     * Sign-in pages, on by default. An app page at the same path wins: the module skips its own. Each shows only what
     * the app's Better Auth set-up supports (eg social buttons for configured providers).
     */
    pages: PagesOptions;
    /**
     * Where people go after signing out from the account page or the admin menu: a path on your site.
     * @default '/'
     */
    signOutRedirect: string;
    /**
     * The language of the pages and default emails: `en` or `es`. When the app uses @nuxtjs/i18n, the pages follow its
     * current language instead (when supported). Nuxt UI's own labels follow `<UApp :locale>`.
     * @default 'en'
     */
    locale: 'en' | 'es';
    /** Two-factor authentication, off by default. */
    twoFactor: TwoFactorOptions;
    /** Passkeys, off by default. */
    passkey: PasskeyOptions;
    /** Usernames, off by default. */
    username: UsernameOptions;
    /** Magic links, off by default. */
    magicLink: MagicLinkOptions;
    /** Sign-in codes by email, off by default. */
    emailOtp: EmailOtpOptions;
    /** Guest accounts, off by default. */
    anonymous: AnonymousOptions;
    /** Captcha on signing up, off by default (false). */
    captcha: CaptchaOptions | false;
    /**
     * Refuse passwords found in data breaches, through Better Auth's Have I Been Pwned plugin, at sign-up, password
     * changes and resets. Only the first 5 characters of the password's SHA-1 hash leave the server.
     * @default false
     */
    haveIBeenPwned: boolean;
    /**
     * "Last used" on the sign-in page's method people used last time, through Better Auth's Last Login Method plugin.
     * It sets a cookie (non-essential, under GDPR); no migration.
     * @default false
     */
    lastLoginMethod: boolean;
    /**
     * Emails the account's owner about a sign-in from a new device, a password change, two-factor turned on or off,
     * and a passkey added (templates `new-sign-in`, `password-changed`, `two-factor-changed`, `passkey-added`). `true`
     * for all, or pick: `{ newSignIn: true, passwordChanged: true }`. Needs `emails.send`.
     * @default false
     */
    securityAlerts: boolean | Partial<SecurityAlerts>;
    /**
     * Auth emails, sent through `betterAuthEmails` in the app's auth config. Paths are relative to the project
     * root, eg `./server/emails/send.ts`; Nuxt aliases work too (`~~/server/…`).
     */
    emails: {
        /** A file whose default export delivers emails: `defineBetterAuthEmailSender(async ({ to, subject, text, html }) => …)`. */
        send?: string;
        /**
         * Files overriding the plain-text default for an email, each exporting
         * `defineBetterAuthEmail('verify-email', async ({ user, url }) => html)`.
         */
        templates?: Partial<Record<BetterAuthEmailName, string>>;
    };
};

/**
 * The Better Auth paths the captcha guards, by default: signing up, and asking for a magic link or an email code
 * (which can sign up, and send email to any address).
 */
const captchaEndpoints = ({ captcha, magicLink, emailOtp }: ModuleOptions) =>
    (captcha && captcha.endpoints) || [
        '/sign-up/email',
        ...(magicLink.enabled ? ['/sign-in/magic-link'] : []),
        ...(emailOtp.enabled ? ['/email-otp/send-verification-otp'] : [])
    ];

/** `securityAlerts: true` turns every alert on; an object turns on the ones it names. False when none are. */
const resolveSecurityAlerts = (option: ModuleOptions['securityAlerts']): SecurityAlerts | false => {
    const all = option === true;
    const picked = typeof option === 'object' ? option : {};
    const alerts: SecurityAlerts = {
        newSignIn: all || !!picked.newSignIn,
        passwordChanged: all || !!picked.passwordChanged,
        twoFactor: all || !!picked.twoFactor,
        passkeyAdded: all || !!picked.passkeyAdded
    };
    return Object.values(alerts).some(Boolean) ? alerts : false;
};

/** The layout the admin pages use: a Nuxt UI dashboard, separate from the app's own layouts. */
const LAYOUT = 'better-auth-ui';

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: '@treygrr/nuxt-better-auth-ui',
        configKey: 'betterAuthUi',
        compatibility: { nuxt: '^4.6.0' }
    },
    defaults: {
        admin: {
            enabled: true,
            route: '/admin',
            role: 'admin',
            roles: {},
            impersonation: false,
            auditLog: true,
            auditLogRetentionDays: 30,
            auditUserEvents: true,
            activityTracking: { enabled: false },
            notes: false
        },
        pages: {
            signIn: '/login',
            signUp: '/signup',
            forgotPassword: '/forgot-password',
            resetPassword: '/reset-password',
            account: '/account',
            twoFactor: '/two-factor'
        },
        signOutRedirect: '/',
        locale: 'en',
        twoFactor: { enabled: false, otp: false, required: false },
        passkey: { enabled: false },
        username: { enabled: false },
        magicLink: { enabled: false },
        emailOtp: { enabled: false },
        anonymous: { enabled: false },
        captcha: false,
        haveIBeenPwned: false,
        lastLoginMethod: false,
        securityAlerts: false,
        emails: {}
    },
    // Installed before this module, in order, and checked against these versions.
    moduleDependencies: {
        '@nuxt/ui': { version: '>=4.12.0' },
        '@nuxtjs/better-auth': { version: '>=0.3.12' },
        // useBreakpoints and friends, used by the dashboard template's pages.
        '@vueuse/nuxt': { version: '>=14.0.0' }
    },
    async setup(moduleOptions, nuxt) {
        const { resolve } = createResolver(import.meta.url);
        const { admin: options, emails } = moduleOptions;

        // The app's email sender and templates, for `betterAuthEmails`. A virtual module, so Nitro bundles the
        // app's files; the helper only imports it when it sends, since the auth config also loads at build time.
        const EMAILS = EMAIL_NAMES;
        const unknownEmails = Object.keys(emails.templates ?? {}).filter(
            (name) => !EMAILS.includes(name as BetterAuthEmailName)
        );
        if (unknownEmails.length) {
            throw new Error(
                `[better-auth-ui] Unknown email template ${unknownEmails.join(', ')}. Use ${EMAILS.join(', ')}.`
            );
        }
        // Relative to the project root, like Nuxt's other paths; aliases work too (`~~/server/…`). For the app's
        // other server files too.
        const emailFile = async (setting: string, file: string) => {
            const path = await resolvePath(file, { cwd: nuxt.options.rootDir });
            if (!existsSync(path)) {
                throw new Error(`[better-auth-ui] ${setting}: can't find "${file}" (looked for ${path})`);
            }
            return path;
        };
        const emailFiles = {
            send: emails.send && (await emailFile('emails.send', emails.send)),
            templates: await Promise.all(
                Object.entries(emails.templates ?? {}).map(
                    async ([name, file]) => [name, await emailFile(`emails.templates['${name}']`, file!)] as const
                )
            )
        };
        nuxt.hook('nitro:config', (nitroConfig) => {
            nitroConfig.virtual ??= {};
            nitroConfig.virtual['#better-auth-ui/email-config'] = () =>
                [
                    emailFiles.send ? `import send from ${JSON.stringify(emailFiles.send)}` : 'const send = undefined',
                    ...emailFiles.templates.map(([, file], i) => `import template${i} from ${JSON.stringify(file)}`),
                    `export const emailConfig = { send, locale: ${JSON.stringify(moduleOptions.locale)}, templates: { ${emailFiles.templates
                        .map(([name], i) => `${JSON.stringify(name)}: template${i}`)
                        .join(', ')} } }`
                ].join('\n');
        });

        // Sign-in pages, in the app's own layout.
        const pagePaths = Object.fromEntries(
            Object.entries(moduleOptions.pages).map(([name, path]) => [
                name,
                path ? `/${String(path).replace(/^\/+|\/+$/g, '')}` : false
            ])
        ) as PagesOptions;
        const AUTH_PAGES: Array<[keyof PagesOptions, string]> = [
            ['signIn', 'sign-in.vue'],
            ['signUp', 'sign-up.vue'],
            ['forgotPassword', 'forgot-password.vue'],
            ['resetPassword', 'reset-password.vue'],
            ['account', 'account.vue'],
            ['twoFactor', 'two-factor.vue']
        ];
        const { twoFactor } = moduleOptions;
        if (twoFactor.otp && !emails.send) {
            throw new Error('[better-auth-ui] twoFactor.otp sends codes by email: set emails.send too.');
        }
        if (twoFactor.required && !twoFactor.enabled) {
            throw new Error('[better-auth-ui] twoFactor.required needs twoFactor.enabled.');
        }
        if (Array.isArray(twoFactor.required) && options.enabled) {
            const roleNames = ['user', options.role, ...Object.keys(options.roles)];
            const unknown = twoFactor.required.filter((role) => !roleNames.includes(role));
            if (unknown.length) {
                throw new Error(
                    `[better-auth-ui] twoFactor.required: ${unknown.join(', ')} isn't a role. Use ${roleNames.join(', ')}.`
                );
            }
        }
        extendPages((pages) => {
            for (const [name, file] of AUTH_PAGES) {
                const path = pagePaths[name];
                if (!path) continue;
                // The app's own page at this path wins.
                if (pages.some((page) => page.path === path)) {
                    useLogger('better-auth-ui').info(
                        `Using the app's own ${path} instead of the module's ${name} page.`
                    );
                    pagePaths[name] = path;
                    continue;
                }
                pages.push({ name: `better-auth-ui-${name}`, path, file: resolve(`./runtime/app/pages/auth/${file}`) });
            }
        });
        // With guest accounts, guests may use the sign-in and sign-up pages, to keep their account (Better Auth links
        // it when they sign in or up); the module's middleware sends other signed-in users on instead.
        const guestPages: Array<keyof PagesOptions> = moduleOptions.anonymous.enabled ? ['signIn', 'signUp'] : [];
        for (const [name] of AUTH_PAGES) {
            const path = pagePaths[name];
            // The account page is for signed-in users; the others send signed-in users on
            // (@nuxtjs/better-auth's redirects.guest).
            if (path) {
                extendRouteRules(path, {
                    auth: guestPages.includes(name) ? false : { only: name === 'account' ? 'user' : 'guest' }
                });
            }
        }
        if (guestPages.length) {
            addRouteMiddleware({
                name: 'better-auth-ui-guests',
                path: resolve('./runtime/app/middleware/guests'),
                global: true
            });
        }
        addServerHandler({
            route: `${UI_API}/capabilities`,
            method: 'get',
            handler: resolve('./runtime/server/api/capabilities.get')
        });
        addImports([
            { name: 'useAuthCapabilities', from: resolve('./runtime/app/composables/useAuthCapabilities') },
            { name: 'useAuthPages', from: resolve('./runtime/app/composables/useAuthPages') },
            { name: 'useRedirectTarget', from: resolve('./runtime/app/composables/useAuthPages') },
            { name: 'useAuthI18n', from: resolve('./runtime/app/i18n/index') }
        ]);

        if (!safeLocalPath(moduleOptions.signOutRedirect)) {
            throw new Error(
                `[better-auth-ui] signOutRedirect must be a path on your site, eg '/', not "${moduleOptions.signOutRedirect}".`
            );
        }
        const securityAlerts = resolveSecurityAlerts(moduleOptions.securityAlerts);
        (nuxt.options.runtimeConfig.public as Record<string, unknown>).betterAuthUi = {
            pages: pagePaths,
            signOutRedirect: moduleOptions.signOutRedirect,
            twoFactorRequired: twoFactor.required,
            locale: moduleOptions.locale,
            // Which alerts are on: the configuration page lists them, and the admin's two-factor reset sends one.
            securityAlerts,
            // The widget's public half; the secret key stays on the server (BETTER_AUTH_CAPTCHA_SECRET_KEY).
            captcha: moduleOptions.captcha
                ? {
                      provider: moduleOptions.captcha.provider,
                      siteKey: moduleOptions.captcha.siteKey,
                      endpoints: captchaEndpoints(moduleOptions)
                  }
                : false
        };

        // Better Auth's Two-Factor plugin, with codes by email through the module's emails when `otp` is on.
        if (twoFactor.enabled) {
            const twoFactorOptions = {
                // Social-only users can turn it on too: the module also asks for the code after passwordless sign-ins.
                allowPasswordless: true,
                ...(twoFactor.issuer !== undefined && { issuer: twoFactor.issuer }),
                ...(twoFactor.trustDeviceMaxAge !== undefined && { trustDeviceMaxAge: twoFactor.trustDeviceMaxAge })
            };
            const twoFactorServer = addTemplate({
                filename: 'better-auth-ui/two-factor-server.mjs',
                write: true,
                getContents: () =>
                    [
                        "import { twoFactor } from 'better-auth/plugins'",
                        ...(twoFactor.otp
                            ? [
                                  `import { betterAuthEmails } from ${JSON.stringify(resolve('./runtime/server/emails/index'))}`,
                                  `export default twoFactor({ ...${JSON.stringify(twoFactorOptions)}, otpOptions: { sendOTP: betterAuthEmails.twoFactorCode } })`
                              ]
                            : [`export default twoFactor(${JSON.stringify(twoFactorOptions)})`])
                    ].join('\n')
            });
            const twoFactorClient = addTemplate({
                filename: 'better-auth-ui/two-factor-client.mjs',
                write: true,
                getContents: () =>
                    [
                        "import { twoFactorClient } from 'better-auth/client/plugins'",
                        // The sign-in page sends users on to the two-factor page itself, keeping where they were heading.
                        'export default twoFactorClient()'
                    ].join('\n')
            });
            // Challenges passwordless sign-ins too, and enforces `required`. Right after the plugin, so later plugins'
            // hooks (the audit log) see a challenged sign-in as not signed in yet.
            const enforcement = addTemplate({
                filename: 'better-auth-ui/two-factor-enforcement.mjs',
                write: true,
                getContents: () => {
                    const auth = (nuxt.options.runtimeConfig.public as { auth?: { redirectQueryKey?: string } }).auth;
                    const enforcementOptions = {
                        required: twoFactor.required,
                        page: pagePaths.twoFactor,
                        redirectQueryKey: auth?.redirectQueryKey ?? 'redirect'
                    };
                    return [
                        `import { twoFactorEnforcement } from ${JSON.stringify(resolve('./runtime/server/two-factor/plugin'))}`,
                        `export default twoFactorEnforcement(${JSON.stringify(enforcementOptions)})`
                    ].join('\n');
                }
            });
            nuxt.hook('better-auth:plugins:extend', (sources) => {
                (sources.server ??= []).push(twoFactorServer.dst, enforcement.dst);
                (sources.client ??= []).push(twoFactorClient.dst);
            });
            if (twoFactor.required) {
                addServerHandler({
                    middleware: true,
                    handler: resolve('./runtime/server/middleware/two-factor-required')
                });
                addRouteMiddleware({
                    name: 'better-auth-ui-two-factor-required',
                    path: resolve('./runtime/app/middleware/two-factor-required'),
                    global: true
                });
            }
        }
        // Also for apps that add the plugin themselves: the account page shows two-factor whenever it's in use.
        addServerHandler({
            route: `${UI_API}/two-factor`,
            method: 'get',
            handler: resolve('./runtime/server/api/two-factor.get')
        });
        // "Download my data" on the account page: what the auth keeps about the signed-in user.
        addServerHandler({
            route: `${UI_API}/export`,
            method: 'get',
            handler: resolve('./runtime/server/api/export.get')
        });

        // Better Auth's Passkey plugin, from its own package, which the app installs.
        const { passkey } = moduleOptions;
        if (passkey.enabled) {
            if (!(await tryResolveModule('@better-auth/passkey', nuxt.options.modulesDir))) {
                throw new Error('[better-auth-ui] passkey.enabled needs the @better-auth/passkey package: install it.');
            }
            const passkeyOptions = Object.fromEntries(
                (['rpName', 'rpID', 'origin'] as const)
                    .filter((key) => passkey[key] !== undefined)
                    .map((key) => [key, passkey[key]])
            );
            const passkeyServer = addTemplate({
                filename: 'better-auth-ui/passkey-server.mjs',
                write: true,
                getContents: () =>
                    [
                        "import { passkey } from '@better-auth/passkey'",
                        `export default passkey(${JSON.stringify(passkeyOptions)})`
                    ].join('\n')
            });
            const passkeyClient = addTemplate({
                filename: 'better-auth-ui/passkey-client.mjs',
                write: true,
                getContents: () =>
                    [
                        "import { passkeyClient } from '@better-auth/passkey/client'",
                        'export default passkeyClient()'
                    ].join('\n')
            });
            nuxt.hook('better-auth:plugins:extend', (sources) => {
                (sources.server ??= []).push(passkeyServer.dst);
                (sources.client ??= []).push(passkeyClient.dst);
            });
        }

        // More of Better Auth's own plugins, each added to the app's auth config (and client, where it has one).
        const addAuthPlugin = (name: string, server: string[], client?: string[]) => {
            const serverFile = addTemplate({
                filename: `better-auth-ui/${name}-server.mjs`,
                write: true,
                getContents: () => server.join('\n')
            });
            const clientFile =
                client &&
                addTemplate({
                    filename: `better-auth-ui/${name}-client.mjs`,
                    write: true,
                    getContents: () => client.join('\n')
                });
            nuxt.hook('better-auth:plugins:extend', (sources) => {
                (sources.server ??= []).push(serverFile.dst);
                if (clientFile) (sources.client ??= []).push(clientFile.dst);
            });
        };
        const emailsHelper = JSON.stringify(resolve('./runtime/server/emails/index'));

        const { username, magicLink, emailOtp, anonymous, captcha } = moduleOptions;
        if (username.enabled) {
            const usernameOptions = {
                ...(username.minLength !== undefined && { minUsernameLength: username.minLength }),
                ...(username.maxLength !== undefined && { maxUsernameLength: username.maxLength }),
                ...(username.immutable && { immutableUsername: true })
            };
            addAuthPlugin(
                'username',
                [
                    "import { username } from 'better-auth/plugins'",
                    `export default username(${JSON.stringify(usernameOptions)})`
                ],
                ["import { usernameClient } from 'better-auth/client/plugins'", 'export default usernameClient()']
            );
        }
        if (magicLink.enabled) {
            if (!emails.send) throw new Error('[better-auth-ui] magicLink sends links by email: set emails.send too.');
            const magicLinkOptions = {
                ...(magicLink.expiresIn !== undefined && { expiresIn: magicLink.expiresIn }),
                ...(magicLink.disableSignUp !== undefined && { disableSignUp: magicLink.disableSignUp })
            };
            addAuthPlugin(
                'magic-link',
                [
                    "import { magicLink } from 'better-auth/plugins'",
                    `import { betterAuthEmails } from ${emailsHelper}`,
                    `export default magicLink({ ...${JSON.stringify(magicLinkOptions)}, sendMagicLink: betterAuthEmails.magicLink })`
                ],
                ["import { magicLinkClient } from 'better-auth/client/plugins'", 'export default magicLinkClient()']
            );
        }
        if (emailOtp.enabled) {
            if (!emails.send) throw new Error('[better-auth-ui] emailOtp sends codes by email: set emails.send too.');
            const emailOtpOptions = {
                ...(emailOtp.otpLength !== undefined && { otpLength: emailOtp.otpLength }),
                ...(emailOtp.expiresIn !== undefined && { expiresIn: emailOtp.expiresIn }),
                ...(emailOtp.allowedAttempts !== undefined && { allowedAttempts: emailOtp.allowedAttempts }),
                ...(emailOtp.disableSignUp !== undefined && { disableSignUp: emailOtp.disableSignUp })
            };
            addAuthPlugin(
                'email-otp',
                [
                    "import { emailOTP } from 'better-auth/plugins'",
                    `import { betterAuthEmails } from ${emailsHelper}`,
                    `export default emailOTP({ ...${JSON.stringify(emailOtpOptions)}, sendVerificationOTP: betterAuthEmails.emailCode })`
                ],
                ["import { emailOTPClient } from 'better-auth/client/plugins'", 'export default emailOTPClient()']
            );
        }
        if (anonymous.enabled) {
            const anonymousOptions = {
                ...(anonymous.emailDomainName !== undefined && { emailDomainName: anonymous.emailDomainName }),
                ...(anonymous.disableDeleteAnonymousUser !== undefined && {
                    disableDeleteAnonymousUser: anonymous.disableDeleteAnonymousUser
                })
            };
            // The app's onLinkAccount, through a virtual module like the emails, imported only when a guest links:
            // the auth config also loads at build time, where the app's server code can't run.
            const linkFile =
                anonymous.onLinkAccount && (await emailFile('anonymous.onLinkAccount', anonymous.onLinkAccount));
            if (linkFile) {
                nuxt.hook('nitro:config', (nitroConfig) => {
                    (nitroConfig.virtual ??= {})['#better-auth-ui/anonymous-link'] = () =>
                        `export { default } from ${JSON.stringify(linkFile)}`;
                });
            }
            addAuthPlugin(
                'anonymous',
                [
                    "import { anonymous } from 'better-auth/plugins'",
                    `export default anonymous({ ...${JSON.stringify(anonymousOptions)}${
                        linkFile
                            ? ", onLinkAccount: async (data) => (await import('#better-auth-ui/anonymous-link')).default(data)"
                            : ''
                    } })`
                ],
                ["import { anonymousClient } from 'better-auth/client/plugins'", 'export default anonymousClient()']
            );
        }
        if (captcha) {
            const endpoints = captchaEndpoints(moduleOptions);
            addAuthPlugin('captcha', [
                "import { captcha } from 'better-auth/plugins'",
                // The secret key comes from the environment at runtime, never from nuxt.config.
                `export default captcha({ provider: ${JSON.stringify(captcha.provider)}, secretKey: process.env.BETTER_AUTH_CAPTCHA_SECRET_KEY ?? '', endpoints: ${JSON.stringify(endpoints)}${captcha.provider === 'hcaptcha' ? `, siteKey: ${JSON.stringify(captcha.siteKey)}` : ''} })`
            ]);
        }
        if (moduleOptions.haveIBeenPwned) {
            addAuthPlugin('have-i-been-pwned', [
                "import { haveIBeenPwned } from 'better-auth/plugins'",
                'export default haveIBeenPwned()'
            ]);
        }
        if (moduleOptions.lastLoginMethod) {
            addAuthPlugin(
                'last-login-method',
                [
                    "import { lastLoginMethod } from 'better-auth/plugins'",
                    // Username sign-ins use the password form too, which Better Auth calls "email".
                    "export default lastLoginMethod({ customResolveMethod: (ctx) => (ctx.path === '/sign-in/username' ? 'email' : null) })"
                ],
                [
                    "import { lastLoginMethodClient } from 'better-auth/client/plugins'",
                    'export default lastLoginMethodClient()'
                ]
            );
        }
        if (securityAlerts) {
            if (!emails.send) throw new Error('[better-auth-ui] securityAlerts are emails: set emails.send too.');
            addAuthPlugin('security-alerts', [
                `import { securityAlerts } from ${JSON.stringify(resolve('./runtime/server/alerts/plugin'))}`,
                `export default securityAlerts(${JSON.stringify({ ...securityAlerts, accountPath: pagePaths.account })})`
            ]);
        }
        if (!options.enabled) return;

        // The admin dashboard.
        const route = `/${options.route.replace(/^\/+|\/+$/g, '')}`;

        const roles = resolveRoles(options.role, options.roles);
        const roleNames = ['user', options.role, ...Object.keys(options.roles)];
        if (options.defaultRole && !roleNames.includes(options.defaultRole)) {
            throw new Error(
                `[better-auth-ui] defaultRole "${options.defaultRole}" isn't a role. Use ${roleNames.join(', ')}.`
            );
        }
        // Documented Admin plugin options the app set, passed straight through.
        const adminOptions = Object.fromEntries(
            (
                [
                    'defaultRole',
                    'defaultBanReason',
                    'defaultBanExpiresIn',
                    'bannedUserMessage',
                    'impersonationSessionDuration'
                ] as const
            )
                .filter((key) => options[key] !== undefined)
                .map((key) => [key, options[key]])
        );
        if (roles.withoutAccess.length) {
            useLogger('better-auth-ui').warn(
                `Role${roles.withoutAccess.length > 1 ? 's' : ''} ${roles.withoutAccess.join(', ')} can't list users, so can't open the admin pages.`
            );
        }

        (nuxt.options.runtimeConfig.public.betterAuthUi as Record<string, unknown>).admin = {
            route,
            role: options.role,
            roles: roles.names,
            staffRoles: roles.staff,
            impersonation: options.impersonation,
            auditLog: options.auditLog,
            lastSignIn: options.auditLog && options.auditUserEvents,
            activityTracking: options.activityTracking.enabled,
            activityInterval: options.activityTracking.updateInterval ?? 300_000,
            auditLogRetentionDays: Math.max(0, Math.floor(options.auditLogRetentionDays)),
            notes: options.notes,
            // For the configuration page: whether emails can be sent, and which have the app's own template.
            emails: { send: !!emails.send, templates: Object.keys(emails.templates ?? {}) }
        } satisfies BetterAuthAdminPublicConfig;

        // The roles, built with Better Auth's access control. The server and client plugins and the admin pages
        // (as #better-auth-ui/roles) all use this one file.
        const rolesTemplate = addTemplate({
            filename: 'better-auth-ui/roles.mjs',
            write: true,
            getContents: () => rolesFile(options.role, options.roles)
        });
        addTemplate({ filename: 'better-auth-ui/roles.d.mts', write: true, getContents: () => rolesTypes });
        nuxt.options.alias['#better-auth-ui/roles'] = rolesTemplate.dst;

        // Better Auth's Admin plugin, added to the app's auth config through @nuxtjs/better-auth.
        // It adds the role and ban columns to the user table and the /api/auth/admin/* endpoints. Passed `ac` and
        // `roles` only, as documented (https://better-auth.com/docs/plugins/admin#access-control): with custom
        // access control `adminRoles` isn't needed, and its default (`admin`) decides who needs impersonate-admins.
        const serverPlugin = addTemplate({
            filename: 'better-auth-ui/server-plugin.mjs',
            write: true,
            getContents: () =>
                [
                    "import { admin } from 'better-auth/plugins'",
                    "import { ac, roles } from './roles.mjs'",
                    `export default admin({ ac, roles, ...${JSON.stringify(adminOptions)} })`
                ].join('\n')
        });
        // Better Auth lets any admin impersonate. With the option off, this refuses the endpoint, so hiding the
        // button isn't the only thing standing in the way.
        const impersonationOff = addTemplate({
            filename: 'better-auth-ui/impersonation-off.mjs',
            write: true,
            getContents: () =>
                [
                    "import { APIError, createAuthMiddleware } from 'better-auth/api'",
                    'export default {',
                    "    id: 'better-auth-ui-impersonation-off',",
                    '    hooks: {',
                    '        before: [{',
                    "            matcher: (context) => context.path === '/admin/impersonate-user',",
                    '            handler: createAuthMiddleware(async () => {',
                    "                throw new APIError('FORBIDDEN', { message: 'Impersonation is turned off (betterAuthUi.admin.impersonation)' })",
                    '            })',
                    '        }]',
                    '    }',
                    '}'
                ].join('\n')
        });
        const auditLog = addTemplate({
            filename: 'better-auth-ui/audit-log.mjs',
            write: true,
            getContents: () =>
                [
                    `import { adminAuditLog } from ${JSON.stringify(resolve('./runtime/server/audit/plugin'))}`,
                    `export default adminAuditLog(${JSON.stringify({ retentionDays: Math.max(0, Math.floor(options.auditLogRetentionDays)), userEvents: options.auditUserEvents })})`
                ].join('\n')
        });
        const activity = addTemplate({
            filename: 'better-auth-ui/activity.mjs',
            write: true,
            getContents: () =>
                [
                    `import { adminActivityTracking } from ${JSON.stringify(resolve('./runtime/server/activity/plugin'))}`,
                    `export default adminActivityTracking(${JSON.stringify({ updateInterval: options.activityTracking.updateInterval ?? 300_000 })})`
                ].join('\n')
        });
        const notes = addTemplate({
            filename: 'better-auth-ui/notes.mjs',
            write: true,
            getContents: () =>
                [
                    `import { adminUserNotes } from ${JSON.stringify(resolve('./runtime/server/notes/plugin'))}`,
                    'export default adminUserNotes()'
                ].join('\n')
        });
        const clientPlugin = addTemplate({
            filename: 'better-auth-ui/client-plugin.mjs',
            write: true,
            getContents: () =>
                [
                    "import { adminClient } from 'better-auth/client/plugins'",
                    "import { ac, roles } from './roles.mjs'",
                    'export default adminClient({ ac, roles })'
                ].join('\n')
        });
        // @nuxtjs/better-auth calls this at `modules:done`, after every module's setup.
        nuxt.hook('better-auth:plugins:extend', (sources) => {
            (sources.server ??= []).push(serverPlugin.dst);
            if (!options.impersonation) sources.server.push(impersonationOff.dst);
            if (options.auditLog) sources.server.push(auditLog.dst);
            if (options.activityTracking.enabled) sources.server.push(activity.dst);
            if (options.notes) sources.server.push(notes.dst);
            (sources.client ??= []).push(clientPlugin.dst);
        });

        // Module files live in node_modules, where Nuxt doesn't auto-import, so they import these
        // from #imports explicitly; registering them is what makes that work.
        addImports([
            { name: 'useBetterAuthAdminConfig', from: resolve('./runtime/app/utils/config') },
            { name: 'useAdminPath', from: resolve('./runtime/app/utils/config') },
            { name: 'useAdminDashboard', from: resolve('./runtime/app/composables/useDashboard') },
            { name: 'useAdminUsers', from: resolve('./runtime/app/composables/useAdminUsers') },
            { name: 'useAdminCan', from: resolve('./runtime/app/composables/useAdminCan') }
        ]);
        // Prefixed, so they can't clash with the app's own components: <AdminUserMenu>, <AdminHomeStats>, …
        addComponentsDir({ path: resolve('./runtime/app/components'), prefix: 'Admin' });

        // A user's linked sign-in methods, which Better Auth's Admin plugin has no endpoints for.
        if (options.activityTracking.enabled) {
            addServerHandler({
                route: `${ADMIN_API}/last-active`,
                method: 'get',
                handler: resolve('./runtime/server/api/last-active.get')
            });
        }
        if (options.auditLog && options.auditUserEvents) {
            addServerHandler({
                route: `${ADMIN_API}/last-sign-in`,
                method: 'get',
                handler: resolve('./runtime/server/api/last-sign-in.get')
            });
        }
        if (options.auditLog) {
            addServerHandler({
                route: `${ADMIN_API}/audit`,
                method: 'get',
                handler: resolve('./runtime/server/api/audit.get')
            });
        }
        addServerHandler({
            route: `${ADMIN_API}/sessions`,
            method: 'get',
            handler: resolve('./runtime/server/api/sessions.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/stats`,
            method: 'get',
            handler: resolve('./runtime/server/api/stats.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/accounts`,
            method: 'get',
            handler: resolve('./runtime/server/api/accounts.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/send-verification`,
            method: 'post',
            handler: resolve('./runtime/server/api/users/send-verification.post')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/accounts`,
            method: 'get',
            handler: resolve('./runtime/server/api/users/accounts.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/accounts/:accountId`,
            method: 'delete',
            handler: resolve('./runtime/server/api/users/accounts.delete')
        });
        // Helping someone who lost a device: turning their two-factor off, listing and removing their passkeys.
        addServerHandler({
            route: `${ADMIN_API}/users/:id/two-factor/reset`,
            method: 'post',
            handler: resolve('./runtime/server/api/users/two-factor-reset.post')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/passkeys`,
            method: 'get',
            handler: resolve('./runtime/server/api/users/passkeys.get')
        });
        addServerHandler({
            route: `${ADMIN_API}/users/:id/passkeys/:passkeyId`,
            method: 'delete',
            handler: resolve('./runtime/server/api/users/passkeys.delete')
        });
        if (options.notes) {
            addServerHandler({
                route: `${ADMIN_API}/users/:id/notes`,
                method: 'get',
                handler: resolve('./runtime/server/api/users/notes.get')
            });
            addServerHandler({
                route: `${ADMIN_API}/users/:id/notes`,
                method: 'post',
                handler: resolve('./runtime/server/api/users/notes.post')
            });
            addServerHandler({
                route: `${ADMIN_API}/users/:id/notes/:noteId`,
                method: 'delete',
                handler: resolve('./runtime/server/api/users/notes.delete')
            });
        }

        addLayout({ src: resolve('./runtime/app/layouts/admin.vue') }, LAYOUT);

        const page = (name: string, path: string, file: string, children?: NuxtPage[]): NuxtPage => ({
            name: `better-auth-ui${name && `-${name}`}`,
            path: path ? `${route}${path}` : route,
            file: resolve(`./runtime/app/pages/${file}`),
            children
        });
        extendPages((pages) => {
            pages.push(
                page('', '', 'index.vue'),
                // Better Auth user management
                page('users', '/users', 'users/index.vue'),
                page('user', '/users/:id', 'users/[id].vue'),
                page('sessions', '/sessions', 'sessions.vue'),
                ...(options.auditLog ? [page('audit', '/audit', 'audit.vue')] : []),
                // What the app's set-up allows, and who can do what (read-only).
                page('configuration', '/configuration', 'configuration.vue')
            );
        });

        // Signed-in staff only (the admin role, and custom roles that can list users); everyone else is sent to the
        // login page. Better Auth checks permissions again on every /api/auth/admin/* request.
        for (const path of [route, `${route}/**`]) {
            extendRouteRules(path, {
                appLayout: LAYOUT,
                auth: { only: 'user', user: { role: roles.staff } }
            });
        }
    }
});
