# @treygrr/nuxt-better-auth-ui

Auth UI for [Better Auth](https://better-auth.com) in Nuxt, built with [Nuxt UI](https://ui.nuxt.com): an admin
dashboard at `/admin`, where staff manage users through Better Auth's
[Admin plugin](https://better-auth.com/docs/plugins/admin), sign-in pages, a self-service account page, and auth emails with your own templates. Configure it under `betterAuthUi` in `nuxt.config.ts`.

The dashboard's layout comes from the [Nuxt UI dashboard template](https://github.com/nuxt-ui-templates/dashboard)
(MIT): a collapsible sidebar headed by your app's name (Better Auth's `appName`), and a search (⌘K) that finds pages,
actions such as "Create a user", and users by name or email. Keyboard shortcuts: `g` then `h` (home), `u` (users),
`s` (sessions), `a` (audit log) or `c` (configuration). The menu at the foot of the sidebar has your account, light,
dark or system appearance, the way back to the site, and signing out. Everything in it is backed by Better Auth.

## User management

- **Home:** total users, sign-ups (against the previous period), active sessions and bans, a sign-ups chart by
  day, week or month over a chosen range, and the newest users. All from count queries on Better Auth's tables.
- **Users list:** search by email or name, filter (admins, banned, unverified), sort, paginate; select rows to ban or
  delete several at once.
- **Add user:** name, email, optional password, role. "New user" on the home page (or `/admin/users?create=1`) opens
  it straight away; once created, the toast links to their page.
- **Resend verification email** to an unverified user, from their row menu or page. Better Auth only lets signed-in
  users resend to themselves, so the module calls `auth.api.sendVerificationEmail` on the server, which sends through
  the app's own email (and template).
- **Per user** (row menu or the user's page): edit name, email, avatar and verification; change role; set a password
  or email a reset link; ban with a reason and an expiry, or unban; sign out of one session or everywhere; delete.
- **User page:** profile, role and status, ban details, sign-in methods (email and password, Google, GitHub, …), and
  active sessions with device, IP and last activity.
- **Sign-in column** on the users list: an icon per method (key for email and password, GitHub, Google, …), so
  social-only users stand out. Fetched for the current page only, by user id, in one request.
- **Remove a sign-in method** from its menu, eg an old Google link, or their password. Like Better Auth's own
  unlink-account endpoint, the last one can't be removed (it would lock them out) unless the app sets
  `account.accountLinking.allowUnlinkingAll`.
- **Sign in as a user** (impersonation, opt-in with `admin.impersonation: true`), from the row menu or their page, to see
  the app as they do. It uses Better Auth's impersonation: a one-hour session that keeps yours to return to, and
  marks it as an impersonation in their sessions list. Admins and banned users can't be impersonated. Put
  `<AdminImpersonationBanner />` in your app's layout (eg `app.vue`) for a "You're signed in as …" bar with
  **Stop impersonating**, which returns you to their admin page. With the option off, the module refuses Better
  Auth's impersonate-user endpoint too, since Better Auth's default admin role is otherwise allowed to use it.
- **Audit log** (on by default, `admin.auditLog: false` to turn off): every successful admin action — creating, editing,
  banning and unbanning users, role and password changes, deletions, signing sessions out, impersonation and
  removing sign-in methods — with who did it, to whom (names and emails as they were, so deleted users stay
  readable), details such as the ban reason, IP and browser. Entries are kept for 30 days
  (`auditLogRetentionDays`; `0` keeps them forever): older ones are hidden and deleted as new ones are written. Its own **Audit log** page, filterable by action, and
  an **Activity** card on each user's page. It's a small Better Auth plugin that adds one table, `adminAuditLog`,
  through Better Auth's migrations (run them, or `npx @better-auth/cli generate` for Prisma or Drizzle); Better
  Auth's own tables aren't changed. A failed write is logged and never blocks the action.
- **User activity** in the same log (on by default, `admin.auditUserEvents: false` to turn off): sign-ups and sign-ins with
  their method (email, GitHub, a verification link, …), failed sign-ins (for real accounts only; typed-in emails
  without one aren't stored), sign-outs, password reset requests and changes, and email verification. Sign-ins are
  caught through Better Auth's documented `ctx.context.newSession`, so every sign-in method counts. Events that look
  an account up by email are recorded after the response, so they can't reveal through timing whether it exists.
  One write per event.
- **Sessions page:** everyone signed in, most recently active first, with device, IP, when they signed in and when
  the session expires; sign any session out (Better Auth's `revoke-user-session`). Better Auth's Admin plugin only
  lists one user's sessions, so the module reads them itself, a page at a time, only when an admin opens the page
  (`session: list` permission). "Last active" is when Better Auth last refreshed the session (by default at most
  daily). Not available when sessions live only in secondary storage such as Redis.
- **Last active and online now** (opt-in, `admin.activityTracking: { enabled: true }`): a "Last active" column and
  detail, and an "Online now" card on the home page. When Better Auth checks a signed-in user's session (their page
  loads), the module records the time in its own `adminUserActivity` table, at most once per user per
  `updateInterval` (default 5 minutes) on each server, after the response. That's about one write per signed-in
  user per interval: fine for most databases, but it grows with traffic, which is why it's off by default (as in
  Better Auth's own dashboard, whose `activityTracking` adds a `lastActiveAt` user column instead).
- **Last sign-in** on the users list and each user's page, from those events: no extra writes, so it only knows
  sign-ins within the log's retention (older shows as "not in the last 30 days").
- **Two-factor** (with the Two-Factor plugin): a shield on the users list for users who have it on, a "Two-factor
  off" filter, and a badge on each user's page, including "required, not set up" for roles under
  `twoFactor.required`.
- **Lost a device?** Each user's page has a Security card (with the Two-Factor or Passkey plugin): **turn their
  two-factor off** (their authenticator app, backup codes and trusted devices stop working; users who must have it
  are asked to set it up again), and **remove a passkey**. Better Auth has no admin endpoints for these, so the module
  does what its plugins' own disable and delete do, after the `user: update` permission check, and logs both in the
  audit log.
- **Staff notes** (opt-in, `admin.notes: true`): a private Notes card on each user's page ("Warned for spam in
  chat"), newest first, with who wrote each and when. Staff who can view a user (`user: get`) read them; those who
  can update one (`user: update`) add notes and delete their own; those who can delete users delete anyone's. Users
  never see them, and they're left out of a user's data download. Adding and deleting are audit-logged (without the
  note's text). Stored in the module's own `adminUserNote` table, through Better Auth's migrations;
  a user's notes go when the user is deleted.
- **Your app's own user fields** (Better Auth's `user.additionalFields`, eg a company, a plan, a region): a "More
  details" card on each user's page shows them (yes/no, dates, lists), and staff who can update users edit them through
  Better Auth's admin update-user, with a field per type (text, number, date, switch, a select for an enum, commas for
  lists). Server-owned fields (`input: false`) are shown, not edited; fields with `returned: false` aren't shown, as
  Better Auth never returns them. Labels come from the field names ("favoriteColor" shows as "Favorite color").
- **Usernames** (with the Username plugin) show as `@handle` on the users list and each user's page.
- **Configuration page:** how the app is set up, read-only, from its Better Auth config and `betterAuthUi` options:
  sign-in methods and providers, email verification and password rules, two-factor (and who must use it), passkeys,
  impersonation, email changes and deletion, which emails have your own template, the audit log and activity
  tracking. Plus a **roles and permissions** table: every Better Auth Admin permission against every role, checked
  exactly as the server checks it, with the roles that can open the admin pages marked "Staff".
- You can't ban, delete or change the role of your own account here; Better Auth also refuses self-bans.

## Setup

```bash
pnpm add @treygrr/nuxt-better-auth-ui
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ['@treygrr/nuxt-better-auth-ui']
});
```

It depends on [`@nuxt/ui`](https://ui.nuxt.com) and [`@nuxtjs/better-auth`](https://better-auth.nuxt.dev), and installs
them for you through Nuxt's [module dependencies](https://nuxt.com/docs/4.x/guide/modules/module-dependencies). Your app
still needs its own Better Auth config (`server/auth.config.ts`, `app/auth.config.ts`).

Install the icon sets the dashboard uses (Nuxt Icon looks for them in your app's dependencies):

```bash
pnpm add @iconify-json/lucide @iconify-json/simple-icons
```

Tailwind doesn't scan `node_modules`, so point it at the admin pages in your main CSS file:

```css
@import 'tailwindcss';
@import '@nuxt/ui';

@source "../../../node_modules/@treygrr/nuxt-better-auth-ui/dist/runtime";
```

The path is relative to the CSS file; adjust it if yours isn't at `app/assets/css/main.css`.

### Database

The Admin plugin adds `role`, `banned`, `banReason` and `banExpires` to the user table, and `impersonatedBy` to
sessions. Run Better Auth's migrations after installing, the same way you apply your other Better Auth migrations.

### Your first admin

Nobody has the admin role at first. Set it once in your database, for example with SQLite:

```sql
update user set role = 'admin' where email = 'you@example.com';
```

After that, admins can grant the role from the dashboard.

## Options

```ts
export default defineNuxtConfig({
    betterAuthUi: {
        // The admin dashboard (`/admin`).
        admin: {
            // false: no admin pages, routes or Admin plugin.
            enabled: true,
            // Where the admin pages live.
            route: '/admin',
            // The role that can do everything in the admin pages and Better Auth's admin endpoints.
            role: 'admin',
            // More roles, with Better Auth Admin permissions. See "Roles" below.
            roles: {},
            // Let admins sign in as a user (Better Auth's impersonation). Off, its endpoint is refused too.
            impersonation: false,
            // Record admin actions in an adminAuditLog table (added through Better Auth's migrations).
            auditLog: true,
            // Days the audit log keeps entries; 0 keeps them forever.
            auditLogRetentionDays: 30,
            // Also log users' sign-ins, failed sign-ins, sign-outs and password changes; gives "last sign-in".
            auditUserEvents: true,
            // Opt-in "last active" and "online now"; about one write per signed-in user per interval.
            activityTracking: { enabled: false, updateInterval: 5 * 60 * 1000 },
            // Opt-in private staff notes on each user's page, in an adminUserNote table.
            notes: false,

            // Better Auth Admin plugin options, passed through as documented
            // (https://better-auth.com/docs/plugins/admin#options). All optional.
            defaultRole: 'user', // must be user, the admin role, or one of roles
            defaultBanReason: 'Breaking the rules', // when an admin gives none
            defaultBanExpiresIn: 60 * 60 * 24 * 7, // seconds; default: forever
            bannedUserMessage: 'Your account is suspended. Contact support.',
            impersonationSessionDuration: 60 * 60 // seconds
        },
        // Two-factor authentication. See "Two-factor authentication" below.
        twoFactor: { enabled: false, otp: false, required: false },
        // Passkeys (install @better-auth/passkey). See "Passkeys" below.
        passkey: { enabled: false },
        // More ways to sign in, and bot protection. See "More sign-in options" below.
        username: { enabled: false },
        magicLink: { enabled: false },
        emailOtp: { enabled: false },
        captcha: false,
        haveIBeenPwned: false,
        lastLoginMethod: false,
        // Emails about new-device sign-ins, password changes, two-factor and passkeys. See "Security alerts" below.
        securityAlerts: false,
        // The pages' and default emails' language: 'en' or 'es'. See "Languages" below.
        locale: 'en',
        // Auth emails: delivery and templates. See "Emails" below.
        emails: {}
    }
});
```

## Sign-in pages

On by default, in your app's own layout, built with Nuxt UI's `UAuthForm` and `@nuxtjs/better-auth`'s
`useSignIn` / `useSignUp`:

| Page              | Path               | What it does                                                                      |
| ----------------- | ------------------ | --------------------------------------------------------------------------------- |
| Sign in           | `/login`           | email and password, and a button for each social provider you've configured      |
| Sign up           | `/signup`          | name, email, password; "check your email" when you require verification          |
| Forgot password   | `/forgot-password` | emails a reset link (the same answer whether or not the email has an account)    |
| Reset password    | `/reset-password`  | where reset links land: choose a new password, or ask for a new link if it expired |
| Account           | `/account`         | see "Account page" below                                                        |
| Two-factor        | `/two-factor`      | the second step of a password sign-in, for users with two-factor on             |

- **Each page shows only what your Better Auth set-up supports**, read from it at runtime: social buttons for configured
  providers, sign-up only when it's enabled, password length rules, "Forgot password?" only with reset emails.
- **Your own page wins:** if your app already has a page at one of these paths, the module uses yours. Move or turn off
  any of them with `pages`:

    ```ts
    betterAuthUi: {
        pages: { signIn: '/sign-in', signUp: false }
    }
    ```

- **Social sign-in:** returning users go back where they were heading; brand-new accounts start on the account page
  (Better Auth's `newUserCallbackURL`); if the provider sign-in fails (eg GitHub hides the email), they come back to
  the sign-in page with a readable message (`errorCallbackURL`).
- `/login` is where `@nuxtjs/better-auth` sends signed-out visitors by default. After signing in, people go back
  where they came from (its `?redirect=`, checked to be a path on your site), else to its `redirects.authenticated`,
  else `/`. Signed-in visitors are sent away from these pages.
- **Signing out** (the account page's button, the admin menu's "Log out") goes to `/`; change it with
  `signOutRedirect: '/goodbye'`.

## Account page

`/account` (signed-in users only; `pages.account` moves or turns it off), in your app's layout, using Better Auth's own
user and session APIs ([User & Accounts](https://better-auth.com/docs/concepts/users-accounts),
[Session Management](https://better-auth.com/docs/concepts/session-management)):

| Section          | What people can do                                                                                 | Needs                                 |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Profile          | change their name and avatar                                                                       |                                       |
| Email            | resend the verification link; change their email (approved from the old address when it's verified, then verified at the new one) | `user.changeEmail.enabled` to change |
| Your data        | download what the auth keeps about them as JSON (see below)                                        |                                       |
| Password         | change it, optionally signing out other devices; accounts without one get a link to set one        | email and password sign-in            |
| Passkeys         | add, rename and remove passkeys                                                                    | the Passkey plugin                    |
| Two-factor       | set up an authenticator app (QR code, backup codes) or email codes; new backup codes; turn it off   | the Two-Factor plugin                 |
| Sign-in methods  | connect another social provider, disconnect one (never the last)                                   | social providers                      |
| Devices          | see where they're signed in, sign out of one or all others                                         |                                       |
| Delete account   | with their password, a recent sign-in, or an email confirmation                                    | `user.deleteUser.enabled`             |

An overview card sits on top: avatar, name, email, role, "member since", and a tile for each part of the account's
security (email, two-factor, passkeys, sign-in methods, devices) that opens where it's managed. Below it the sections
are in tabs (Profile, Security, Devices, Delete), with the open one in the URL (`/account?tab=security`), so it's
server-rendered and linkable. Sections the app's Better Auth set-up doesn't support are left out. The lists are server-rendered from Better Auth's
`list-accounts` and `list-sessions`.

"Download my data" (GDPR's right of access) gives `account-data.json` from `GET /api/_better-auth-ui/export`: their
user row (with the app's own user fields), sign-in methods, sessions, passkeys, whether two-factor is on, when they
were last active, and their audit history. Never secrets: no password hashes, tokens, two-factor secrets, backup codes
or passkey keys. History entries by an admin say "an admin", without the admin's name, email, IP or browser. It covers
the auth's tables only: the app's own data about them is the app's to add.

## Two-factor authentication

Better Auth's [Two-Factor plugin](https://better-auth.com/docs/plugins/2fa), added by the module:

```ts
betterAuthUi: {
    twoFactor: {
        enabled: true,
        // Codes by email too (needs emails.send; template: `two-factor-code`).
        otp: true,
        // The name authenticator apps show. Default: your Better Auth appName.
        issuer: 'Neomons',
        // Seconds "trust this device" lasts. Default: 30 days.
        trustDeviceMaxAge: 60 * 60 * 24 * 30,
        // Who must have it on: true for everyone, or roles. Default: nobody.
        required: ['admin', 'moderator']
    }
}
```

Then run Better Auth's migrations: the plugin adds a `twoFactorEnabled` column to the user table and a `twoFactor`
table.

- **Setting up**, on the account page: scan a QR code (drawn in the browser; the secret never leaves it), confirm with
  the app's first code, save the backup codes. Or, with `otp`, have codes emailed instead. Users with a password
  confirm with it; social-only users can set it up too.
- **Signing in** then asks for a code on `/two-factor` (keeping `?redirect=`): from the app, by email, or a backup code
  (each works once), with "trust this device". Better Auth locks the account for a while after repeated wrong codes.
- **Every sign-in is challenged, not just passwords.** Better Auth's plugin only challenges password sign-ins and
  [suggests hooks](https://better-auth.com/docs/plugins/2fa#sign-in-with-2fa) for the rest; the module adds them, for
  social and Generic OAuth callbacks, social ID tokens, magic links, email OTP and One Tap. They run the plugin's own
  challenge, so codes, trusted devices and lockout work the same; callbacks redirect to `/two-factor` instead of
  signing in. (Passkeys aren't challenged: a passkey is already a second factor.)
- **`required`:** until those users set it up, pages send them to the account page (with a banner saying why), and
  your `/api` routes, the admin's and Better Auth's admin endpoints answer 403; Better Auth's other endpoints stay
  open, since setting it up goes through them. Once it's on, they can't turn it off. **A passkey sign-in counts**:
  it's complete on its own, so a session started with a passkey isn't held back, while one started with a password
  (or a provider) still needs two-factor. The module notes passkey sessions in Better Auth's `verification` table
  (as its Two-Factor plugin does for trusted devices), so there's no extra table. Users are matched by Better
  Auth Admin roles, so a role change applies on their next request.
- **Adding the plugin yourself** (eg for options the module doesn't pass) works too: leave `twoFactor.enabled` off,
  add `twoFactor()` and `twoFactorClient()` to your auth configs, and the account page picks it up. The extra
  challenges and `required` come with the module's plugin only.

## Passkeys

Better Auth's [Passkey plugin](https://better-auth.com/docs/plugins/passkey), from its own package:

```bash
pnpm add @better-auth/passkey
```

```ts
betterAuthUi: {
    passkey: {
        enabled: true,
        // All optional, Better Auth's defaults otherwise:
        rpName: 'Neomons', // the site name passkey prompts show; default: your appName
        rpID: 'neomons.com', // the domain passkeys belong to; default: your base URL's hostname
        origin: 'https://neomons.com' // where they're used from; default: the request's origin
    }
}
```

Then run Better Auth's migrations (it adds a `passkey` table).

- **Account page:** add a passkey (optionally named, eg "Work laptop"; the browser asks where to keep it), see when
  each was added and whether it's synced, rename or remove them.
- **Sign-in page:** a "Sign in with a passkey" button, and the browser offers saved passkeys from the email field
  (conditional UI, where supported). Either way it goes on to `?redirect=` like any sign-in.
- Passkey sign-ins aren't asked for a two-factor code: a passkey is already something you have plus your device's
  fingerprint, face or PIN.
- **Adding the plugin yourself** works too: leave `passkey.enabled` off, add `passkey()` and `passkeyClient()` to
  your auth configs, and the pages pick it up.

## More sign-in options

Each is one of Better Auth's own plugins, added by the module and shown by the pages; each is off by default. As
with two-factor and passkeys, the pages also pick them up when your auth config adds the plugin itself.

```ts
betterAuthUi: {
    // A username at sign-up; signing in with it or the email; changing it on the account page.
    // Adds `username` and `displayUsername` user columns: run Better Auth's migrations.
    username: { enabled: true, minLength: 3, maxLength: 30, immutable: false },
    // "Email me a sign-in link" on the sign-in page (needs emails.send; template: `magic-link`). No migration.
    magicLink: { enabled: true, expiresIn: 300, disableSignUp: false },
    // "Email me a code" on the sign-in page (needs emails.send; template: `email-code`). No migration.
    emailOtp: { enabled: true, otpLength: 6, expiresIn: 300, allowedAttempts: 3, disableSignUp: false },
    // "Continue as a guest" on the sign-in page. Adds an `isAnonymous` user column: run Better Auth's migrations.
    anonymous: { enabled: true, onLinkAccount: './server/auth/link-guest.ts' },
    // Bot protection on signing up (and asking for a sign-in link or code). The secret key is read from
    // BETTER_AUTH_CAPTCHA_SECRET_KEY at runtime, never from nuxt.config.
    captcha: { provider: 'cloudflare-turnstile', siteKey: '0x4AAA…' }, // or 'hcaptcha', 'google-recaptcha' (v2)
    // Refuse passwords found in data breaches at sign-up, password changes and resets.
    haveIBeenPwned: true,
    // "Last time, you signed in with GitHub", and that button highlighted, on the sign-in page.
    lastLoginMethod: true
}
```

- **Usernames:** the sign-up form asks for one (letters, numbers, `_` and `.`, as Better Auth checks them), and the
  sign-in form takes "Email or username": anything with an `@` signs in by email, anything else by username. They're
  case-insensitive (`Pixel_42` and `pixel_42` are the same), and shown as typed. With `immutable`, a username can be set
  once, then not changed.
- **Magic links:** the sign-in page's "Email me a sign-in link" asks for an email and sends a link that works once and
  expires in 5 minutes. The first link for a new email creates the account (unless `disableSignUp`), landing on the
  account page; an expired or used link comes back to the sign-in page with a message. Users with two-factor on are
  asked for their code after the link, like after a password.
- **Codes by email:** "Email me a code" sends a 6-digit code to type in on the same page, for signing in on a device
  that doesn't have the email (a TV, a console, a shared computer). Codes expire in 5 minutes and stop working after 3
  wrong tries; a new email gets an account (unless `disableSignUp`), and two-factor users are asked for their
  two-factor code next. As Better Auth documents, a code sign-in to an account whose email was never verified removes
  that account's password and signs out its sessions: the code proved who owns the email, the password didn't. Better
  Auth's other code endpoints (verifying an email, resetting a password) work too, and their emails are worded to
  match, but the pages only use sign-in codes.
- **Guest accounts** (Better Auth's Anonymous plugin): "Continue as a guest" on the sign-in page starts a real account
  with no email or password, so people use the app straight away. Their account page says it's a guest account, with
  "Create an account", "Sign in" and (unless `disableDeleteAnonymousUser`) "Delete guest account"; email, password
  and security settings are hidden, and two-factor is never required of guests. The sign-in and sign-up pages let
  guests in (other signed-in users are still sent on, to `redirects.guest`): signing up, or in with any method, moves
  them to that account, and Better Auth deletes the guest one. Moving their data is the app's: `onLinkAccount` is a
  file whose default export is Better Auth's `onLinkAccount`, eg
  `export default async ({ anonymousUser, newUser }) => { /* move the cart */ }`. Admin: a "Guest account" badge, and
  a "Guests" filter on the users list. Security alerts are never sent to guests' generated addresses.
- **Captcha:** a Cloudflare Turnstile, hCaptcha or reCAPTCHA v2 widget, loaded in the browser only, on the forms
  whose Better Auth paths `captcha.endpoints` lists. By default that's signing up (`/sign-up/email`) and, with magic
  links or email codes, asking for one (`/sign-in/magic-link`, `/email-otp/send-verification-otp`), since those can
  create an account too. Add `/sign-in/email` or
  `/request-password-reset` to guard those forms as well. Better Auth checks the token on its server.
- **Have I Been Pwned:** only the first 5 characters of the password's SHA-1 hash leave your server. The sign-up, reset
  and change-password forms say the password will be checked.
- **Last used:** Better Auth's Last Login Method plugin remembers the method in a cookie for 30 days (a non-essential
  cookie, under GDPR); the sign-in page reads it on the server, so there's no flash.

## Sign-in providers

The sign-in, sign-up and account pages offer every provider in your auth config: Better Auth's social providers
(`socialProviders`), and the Generic OAuth plugin's `providerId`s, which Better Auth signs in and links the same way.
Each shows with its icon and name: Google, GitHub, Discord, Apple, Microsoft, Facebook, X, GitLab, Twitch, Roblox,
Kick, Spotify, LinkedIn, Reddit, TikTok, Slack and Zoom, and the helpers' Epic Games and Battle.net; others show
their id.

For providers Better Auth has no helper for, `@treygrr/nuxt-better-auth-ui/providers` has Generic OAuth configs:

```ts
// server/auth.config.ts
import { genericOAuth } from 'better-auth/plugins';
import { battleNet, epicGames } from '@treygrr/nuxt-better-auth-ui/providers';

export default defineServerAuth({
    plugins: [
        genericOAuth({
            config: [
                epicGames({ clientId: process.env.EPIC_CLIENT_ID!, clientSecret: process.env.EPIC_CLIENT_SECRET! }),
                battleNet({ clientId: process.env.BNET_CLIENT_ID!, clientSecret: process.env.BNET_CLIENT_SECRET! })
            ]
        })
    ]
});
```

Their redirect URLs are `https://your-site/api/auth/callback/epic-games` and `…/battle-net`. **Neither shares an
email**, and Better Auth needs one per user: the helpers give these accounts a placeholder
(`<id>.<provider>@no-email.invalid`, reserved, never emailed), with their Epic display name or BattleTag as their name,
and the module sends them to a **finish-account page** (`pages.finishAccount`, `/finish-account`) before anything
else: they add their email through Better Auth's change-email (it needs `user.changeEmail.enabled` and verification
emails), which emails them a link; opening it makes it theirs. Your own providers without an email can do the same
with `placeholderEmail(providerId, accountId)`. The helpers follow Epic's and Blizzard's published OpenID set-up, but
haven't been tried against them.

**Sign-in in a popup** (`oauthPopup: true`): the sign-in and sign-up pages open provider sign-ins in a popup instead of
leaving the page, so someone signing in from inside a running app keeps its state; the popup closes itself and the
page moves on, signed in. Where the browser blocks popups, the usual redirect. It's Better Auth's OAuth Popup plugin,
which ships with Better Auth 1.7 but isn't in its documentation yet: the module relies on its code (`signIn.popup`, and
the Bearer plugin it pairs with, which the option adds). Users with two-factor on finish signing in inside the popup.

Not yet: Xbox gamertags (they need Xbox Live's own token exchange after the Microsoft sign-in); Steam (OpenID 2.0, which
Better Auth doesn't support).

## Phone numbers

Signing in with a code by text, through Better Auth's Phone Number plugin. Texts go through your sender, like emails:

```ts
betterAuthUi: {
    phoneNumber: {
        enabled: true,
        otpLength: 6,
        expiresIn: 300, // seconds
        allowedAttempts: 3,
        signUp: false // true: a code to a new number creates an account
    },
    sms: { send: './server/sms/send.ts' }
}
```

```ts
// server/sms/send.ts
import { defineBetterAuthSmsSender } from '@treygrr/nuxt-better-auth-ui/sms';

export default defineBetterAuthSmsSender(async ({ to, text, sms, code }) => {
    await twilio.messages.create({ to, from: '+15550000000', body: text });
});
```

- **Sign-in page:** "Text me a code" asks for the number (spaces, dashes and brackets are dropped; include the country
  code), texts a code, and signs in with it; users with two-factor on are asked for their code next. With `signUp`, a
  new number gets an account named after it, with a generated `<digits>@phone-number.invalid` email that the module
  never emails (they can add a real one from their account). Without it, unknown numbers are told to sign in another
  way and add their number from their account.
- **Account page:** a phone number card: add or change the number (verified with a code, Better Auth's
  `updatePhoneNumber`), or remove it.
- **The texts:** "123456 is your App code. It expires in 5 minutes." in the app's language, with the code first so
  phones offer to fill it in. Your sender gets `sms` (`phone-code` or `phone-reset`) and `code` to write its own.
  Sent in the background, as Better Auth advises.
- Texts cost money and `send-otp` texts any number, so the captcha guards it by default, along with Better Auth's rate
  limits. Admins see a user's number on their page. Adds `phoneNumber` and `phoneNumberVerified` user columns: run
  Better Auth's migrations.

## Signing in devices

For apps on devices without a browser or keyboard (a TV, a console, a CLI, a desktop app): the device shows "Go to
example.com/device and enter ABCD-1234", and the person approves it from their phone or computer. That's Better
Auth's Device Authorization plugin (the OAuth device grant, RFC 8628):

```ts
betterAuthUi: {
    deviceAuthorization: {
        enabled: true,
        // The apps allowed to ask, by client_id, with the name the page shows. Others are refused.
        clients: { 'tv-app': 'Our TV app', 'our-cli': 'Our CLI' },
        page: '/device', // Better Auth's verification_uri
        expiresIn: '30m',
        interval: '5s',
        userCodeLength: 8
    }
}
```

The module adds the plugin (and its `deviceCode` table: run Better Auth's migrations) and the `/device` page:
signed-in only (others sign in first and come back with the code), it takes the code (or reads `?user_code=` from
the device's `verification_uri_complete`), shows which app is asking and what access it wants, warns not to approve a
code someone sent, and approves or denies it. Approvals are in the audit log. Without `clients`, any client id is
accepted, as in Better Auth, and the module warns at build time.

The device side is the app's, with Better Auth's client (`deviceAuthorizationClient`): `device.code({ client_id })`
for the codes, then `device.token(…)` every `interval` until it's approved. That returns a Better Auth session token,
used with the Bearer plugin. The session shows on the account page's Devices tab, where it can be signed out.

## Organizations

Better Auth's organizations as they are, for whatever your app uses them for (teams, workspaces, companies):

```ts
betterAuthUi: {
    organization: {
        enabled: true,
        invitationPage: '/accept-invitation', // invitation links: <page>/<id>
        allowUserToCreateOrganization: true,
        organizationLimit: 5,
        membershipLimit: 100,
        creatorRole: 'owner',
        invitationExpiresIn: 60 * 60 * 48, // seconds
        requireEmailVerificationOnInvitation: false,
        invitationLimit: 100,
        cancelPendingInvitationsOnReInvite: false,
        disableOrganizationDeletion: false,
        // Your own resources, and roles with their permissions (Better Auth's access control). Naming owner, admin or
        // member adds to Better Auth's role; owners also get every action on your resources.
        statements: { project: ['create', 'update', 'delete'] },
        roles: { editor: { project: ['create', 'update'] }, admin: { project: ['delete'] } },
        // Owners and admins create their own roles per organization (dynamic access control).
        dynamicRoles: true, // or { maximumRolesPerOrganization: 10 }
        // Teams within organizations.
        teams: true, // or { maximumTeams: 10, maximumMembersPerTeam: 20, allowRemovingAllTeams: false }
        // Better Auth's schema options: table and field names, and your own fields on its tables.
        schema: { organization: { additionalFields: { website: { type: 'string', required: false } } } },
        // A file whose default export is more plugin options, for functions: organizationHooks, and
        // allowUserToCreateOrganization, organizationLimit or membershipLimit as functions. Added last.
        serverOptions: './server/auth/organization.ts'
    }
}
```

The module builds the roles with Better Auth's access control and passes them (`ac` and `roles`) to the server and
client plugins, and checks them at build time: a permission on a resource or action that doesn't exist fails the
build. Your API checks them with Better Auth's `auth.api.hasPermission({ headers, body: { permissions } })`.

- **Account page:** an "Organizations" tab: their organizations, the active one marked, switching to another, and
  creating one (a name and a slug made from it). "Manage" opens one: its members (owners and admins change roles and
  remove members), invitations (send one by email with a role, copy its link, cancel it), leaving it, and (owners)
  deleting it. Invitations sent to them show at the top with Accept and Decline (Better Auth lists them only for a
  verified email).
- **Invitation page:** the email's link (`/accept-invitation/<id>`, signed in) shows who invited them, to which
  organization and as what, then Accept or Decline. Invitations go out through the module's emails (template
  `organization-invitation`) when `emails.send` is set; their links can be copied from the organization either way.
- **Admin:** an "Organizations" page listing every one (search by name, member counts), each organization's page with
  its members (linking to their user pages) and pending invitations, and a user's organizations on their page.
  Read-only: Better Auth's Organization plugin only lets an organization's own members change it, so staff see but
  don't edit.
- Uses Better Auth's words (organization, owner, admin, member) and its default roles. Adds Better Auth's
  `organization`, `member` and `invitation` tables and the session's `activeOrganizationId`: run its migrations.

## Subscriptions with Stripe

Better Auth's Stripe plugin, with its two packages:

```bash
pnpm add @better-auth/stripe stripe
```

```ts
betterAuthUi: {
    stripe: {
        enabled: true,
        plans: [
            { name: 'basic', priceId: 'price_…', limits: { projects: 5 } },
            {
                name: 'pro',
                priceId: 'price_…',
                annualDiscountPriceId: 'price_…', // offers "Pay yearly"
                limits: { projects: 50 },
                freeTrial: { days: 14 }
            }
        ],
        createCustomerOnSignUp: false,
        requireEmailVerification: false
    }
}
```

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in the environment (read at runtime, never from nuxt.config), and
point a Stripe webhook at `https://your-site/api/auth/stripe/webhook` with `checkout.session.completed` and
`customer.subscription.created`, `.updated` and `.deleted`. Webhooks stay Better Auth's.

- **Account page:** a "Billing" tab: the current plan (active or on a free trial) and when it renews or ends, the
  plans with their limits and trials, choosing or switching one (Stripe Checkout, back to the tab), cancelling (through
  Stripe's billing portal) and resuming before it ends, and "Invoices and payment" for Stripe's billing portal.
- **Admin:** each user's subscriptions (plan, status, renewal) on their page, read-only: billing changes go through
  Stripe.
- Adds Better Auth's `subscription` table and `stripeCustomerId` user column: run its migrations. Not yet: a plan filter
  on the users list, giving a role while a plan is active (do it in Better Auth's subscription hooks), and
  organization subscriptions.

## API keys

Keys for people's scripts, bots and integrations, through Better Auth's API Key plugin. Install its package, then:

```bash
pnpm add @better-auth/api-key
```

```ts
betterAuthUi: {
    apiKey: {
        enabled: true,
        prefix: 'myapp_', // in front of every key
        // Permissions people may give a key (Better Auth's resource → actions), as checkboxes on the form.
        scopes: { projects: ['read', 'write'] },
        // A key in the x-api-key header signs its owner in, like a session.
        enableSessions: false
    }
}
```

The account page gets an "API keys" tab: create a key with a name, an expiry (30, 90 or 365 days, or never) and
permissions, see it once to copy it, then see each key's first characters, permissions, last use and expiry, and
revoke it. Better Auth only takes a key's permissions from server calls, so the module creates keys through its own
route, which checks them against `scopes` and calls Better Auth's `createApiKey` for the signed-in user; listing and
revoking use Better Auth's endpoints. Your API checks a key with Better Auth's
`auth.api.verifyApiKey({ body: { key, permissions: { projects: ['write'] } } })`.

Admins see a user's keys on their page and revoke one that leaked (`user: update`); creating, deleting and revoking
keys are in the audit log, and a user's data download lists their keys (never the key itself). Adds Better Auth's
`apikey` table: run its migrations. Keys kept only in secondary storage (`storage: 'secondary-storage'`, when the app
adds the plugin itself) don't show in the admin.

## Tokens for apps and services

Two of Better Auth's plugins, for clients that can't use the session cookie:

```ts
betterAuthUi: {
    // Session tokens in an `Authorization: Bearer` header: native apps, other servers, the device sign-in above.
    bearer: true, // or { requireSignature: true }
    // JWTs for other services, verified with your public keys. Adds a `jwks` table: run Better Auth's migrations.
    jwt: true // or { issuer, audience, expirationTime: '15m', jwksPath: '/jwks' }
}
```

- **Bearer:** every sign-in returns the session token in a `set-auth-token` response header; send it back as
  `Authorization: Bearer <token>` and Better Auth treats it as the session (`auth.api.getSession({ headers })` on your
  server). Better Auth warns to use it only for clients that can't use cookies.
- **JWT:** `GET /api/auth/token` (or the `set-auth-jwt` header on get-session) gives a short-lived JWT (15 minutes by
  default) with the user in its payload; services verify it with the public keys at `/api/auth/jwks`, without asking
  your app. The configuration page shows that address. It's not a replacement for the session, as Better Auth says.

## Security alerts

`securityAlerts: true` emails an account's owner when something sensitive happens to it, or pick some:
`securityAlerts: { newSignIn: true, passwordChanged: true }`. They go through the module's emails (needs
`emails.send`), with a link to the account page's tab where they can act.

| Alert             | Template             | When                                                                        |
| ----------------- | -------------------- | --------------------------------------------------------------------------- |
| `newSignIn`       | `new-sign-in`        | A sign-in from a browser and OS the account hasn't used before              |
| `passwordChanged` | `password-changed`   | The password is changed, reset, set for the first time, or set by an admin |
| `twoFactor`       | `two-factor-changed` | Two-factor is turned on or off, including an admin's reset                  |
| `passkeyAdded`    | `passkey-added`      | A passkey is added                                                          |

- "A device the account hasn't used before" compares the browser and OS ("Chrome on Windows") with the account's other
  sessions and, with the audit log on, its last 100 sign-ins. It's a hint, not a fingerprint: a second Windows PC with
  Chrome counts as known.
- No alert in an account's first two minutes (signing up signs in), or when an admin impersonates someone. With
  two-factor on, the alert comes after the code, when the sign-in really completes.
- Better Auth's database hooks see each change, whichever endpoint made it, so the module doesn't wrap Better Auth's
  endpoints. Times are written in UTC, in the emails' language.

## Languages

The sign-in pages, the account page, the admin dashboard and the default emails come in English and Spanish:

```ts
betterAuthUi: { locale: 'es' }
```

- **With @nuxtjs/i18n**, the pages follow its current language instead, as visitors switch it (when it's one of these
  two); `locale` then only sets the default emails' language.
- **Better Auth's errors** ("Invalid email or password", "Username is already taken", …) are shown in the page's
  language by their error code; codes the module doesn't know show Better Auth's own message. The module's own routes
  give their errors codes too ("User not found" is `USER_NOT_FOUND`), so admin messages are translated the same way.
- **Your own words:** `messages` replaces any of the module's, per language and key, eg calling organizations
  "teams", or adds a language (English fills the keys it leaves out; default emails and texts stay English):

  ```ts
  betterAuthUi: {
      messages: {
          en: { 'account.tabs.organizations': 'Teams', 'signIn.title': 'Log in', 'errors.USER_NOT_FOUND': 'No such user.' },
          fr: { 'signIn.title': 'Connexion', 'signIn.submit': 'Se connecter' }
      },
      locale: 'fr'
  }
  ```

  The keys are the module's message keys (`src/runtime/app/i18n/auth.en.ts` and `admin.en.ts`; the admin's start
  with `admin.`).
- **Numbers and dates** (the home chart, the stats) follow the page's language.
- **Nuxt UI's own labels** (the password field's "Show password", a select's "No data") follow `<UApp :locale>`, as
  usual for Nuxt UI: pass it `es` from `@nuxt/ui/locale` too.
- **Your email templates** get no language from the module; write them in yours.

## Emails

Better Auth leaves sending auth emails to the app. The module does the sending: plain-text emails by default, or your
own templates, delivered by your own function (Resend, SMTP, …).

1. **Point the module at your files** in `nuxt.config.ts` (relative to the project root; `~~/` works too):

    ```ts
    betterAuthUi: {
        emails: {
            send: './server/emails/send.ts',
            // Optional: emails without a template are sent as plain text.
            templates: { 'verify-email': './server/emails/verify-email.ts' }
        }
    }
    ```

2. **Deliver** them, eg with Resend:

    ```ts
    // server/emails/send.ts
    import { defineBetterAuthEmailSender } from '@treygrr/nuxt-better-auth-ui/emails';

    export default defineBetterAuthEmailSender(async ({ to, subject, text, html }) => {
        await resend.emails.send({ from: 'Neomons <hello@neomons.com>', to, subject, text, html });
    });
    ```

3. **Template** any email you want to design. The input is typed by the email's name, so a wrong name or field is a
   type error. Return HTML (sent with the default subject and the plain-text version), or
   `{ subject, html, text }`:

    ```ts
    // server/emails/verify-email.ts
    import { defineBetterAuthEmail } from '@treygrr/nuxt-better-auth-ui/emails';

    export default defineBetterAuthEmail('verify-email', async ({ user, url }) => ({
        subject: 'Verify your Neomons email',
        html: `<p>Hi ${user.name}!</p><a href="${url}">Verify email</a>`
    }));
    ```

4. **Hand them to Better Auth** in your auth config:

    ```ts
    // server/auth.config.ts
    import { betterAuthEmails } from '@treygrr/nuxt-better-auth-ui/emails';

    export default defineServerAuth({
        emailAndPassword: {
            enabled: true,
            sendResetPassword: betterAuthEmails.resetPassword,
            onExistingUserSignUp: betterAuthEmails.existingUserSignUp
        },
        emailVerification: { sendVerificationEmail: betterAuthEmails.verifyEmail },
        user: {
            changeEmail: { enabled: true, sendChangeEmailConfirmation: betterAuthEmails.changeEmailConfirmation },
            deleteUser: { enabled: true, sendDeleteAccountVerification: betterAuthEmails.deleteAccount }
        }
    });
    ```

| Email                   | Better Auth option                          | Template gets           |
| ----------------------- | ------------------------------------------- | ----------------------- |
| `verify-email`          | `emailVerification.sendVerificationEmail`   | `{ user, url, token }`  |
| `reset-password`        | `emailAndPassword.sendResetPassword`        | `{ user, url, token }`  |
| `existing-user-sign-up` | `emailAndPassword.onExistingUserSignUp`     | `{ user }`              |
| `change-email-confirmation` | `user.changeEmail.sendChangeEmailConfirmation` | `{ user, newEmail, url, token }` |
| `delete-account`        | `user.deleteUser.sendDeleteAccountVerification` | `{ user, url, token }` |
| `two-factor-code`       | Two-Factor `otpOptions.sendOTP` (added by the module with `twoFactor.otp`) | `{ user, otp }` |
| `magic-link`            | Magic Link `sendMagicLink` (added by the module with `magicLink`) | `{ email, url, token }` (no `user`: there may be no account yet) |
| `email-code`            | Email OTP `sendVerificationOTP` (added by the module with `emailOtp`) | `{ email, otp, type }` (`type`: `sign-in`, `email-verification`, `forget-password`, `change-email`) |
| `new-sign-in`           | The module's `securityAlerts.newSignIn`     | `{ user, device, ipAddress, time, accountUrl }` |
| `password-changed`      | The module's `securityAlerts.passwordChanged` | `{ user, time, accountUrl }` |
| `two-factor-changed`    | The module's `securityAlerts.twoFactor`     | `{ user, enabled, time, accountUrl }` |
| `passkey-added`         | The module's `securityAlerts.passkeyAdded`  | `{ user, name, time, accountUrl }` |

Emails are sent in the background, not awaited, as
[Better Auth advises](https://better-auth.com/docs/concepts/email) (waiting would reveal through timing which emails
have accounts); a failed send is logged. A missing file fails the build.

## Roles

Besides `admin` (everything) and `user` (nothing), define roles with any of Better Auth's Admin permissions:

```ts
betterAuthUi: {
    admin: {
        roles: {
            // Handles reports: can view, edit and ban users, and sign their sessions out.
            moderator: { user: ['list', 'get', 'update', 'ban'], session: ['list', 'revoke'] },
            // Can look, not touch.
            support: { user: ['list', 'get'], session: ['list'] }
        }
    }
}
```

- **Permissions:** `user`: `create`, `list`, `get`, `update`, `set-role`, `ban`, `impersonate`, `impersonate-admins`,
  `delete`, `set-password`, `set-email`; `session`: `list`, `revoke`, `delete`. Unknown ones fail the build with the
  list of valid ones.
- **Who gets in:** roles that can `list` users open the admin pages, and are treated as staff, with their own filter
  on the users list.
- **Impersonation** follows Better Auth's default: only users with the `admin` role need `impersonate-admins` to be
  impersonated, since the module passes the Admin plugin `ac` and `roles` and nothing else, as
  [documented](https://better-auth.com/docs/plugins/admin#access-control).
- **What they see:** only the actions their role allows, eg a moderator has no Delete, Change role or Add user, the
  email field is locked without `set-email`, and Password offers only the reset link without `set-password`.
- **Enforced by Better Auth:** the module builds the roles with Better Auth's own access control and passes them to the
  Admin plugin, so every endpoint checks the same permissions, and so do the module's own routes. The pages read the
  same roles file, so they show exactly what the server would allow, identically in the server render and the
  browser.
- Assign roles from **Change role**, which lists the configured roles. A user with several roles
  (Better Auth's comma-separated `role`) gets everything any of them allows.

## How it works

- The module registers Better Auth's `admin()` and `adminClient()` plugins through `@nuxtjs/better-auth`'s
  `better-auth:plugins:extend` hook, so your auth config doesn't change.
- The pages use their own `better-auth-ui` layout, the dashboard template's sidebar layout, separate from your app's
  layouts. Its components are registered with an `Admin` prefix (`<AdminUserMenu>`, `<AdminHomeStats>`, …) so they
  can't clash with yours, and every runtime file imports from `#imports` explicitly, since Nuxt doesn't auto-import
  inside `node_modules`.
- It also installs [`@vueuse/nuxt`](https://vueuse.org/guide/#nuxt), which the template's pages use.
- Left out, because they belong to your app: the template's `app.vue`, `error.vue`, `app.config.ts` colours and CSS
  theme.
- Sign-in methods use the module's own routes, since the Admin plugin has none for them:
  `GET /api/_better-auth-ui/users/:id/accounts` (Better Auth's `user: ['get']` permission; returns provider, account
  ID, scope and dates, never passwords or tokens) and `DELETE …/accounts/:accountId` (`user: ['update']`).
  `GET /api/_better-auth-ui/accounts?userIds=a,b,…` returns `{ [userId]: providerIds }` for up to 100 users, in one
  query, for the users list.
- Route rules let only signed-in staff in (the admin role, and custom roles that can list users); others are sent to
  the login page or get a 403. Better Auth checks permissions again on every `/api/auth/admin/*` request. Users with
  several roles are matched by their whole `role` value, so give them the pages through a single staff role.

## Development

```bash
pnpm install
cp playground/.env.example playground/.env
pnpm dev:prepare
pnpm dev         # the playground
pnpm test        # builds the module and the playground, starts it once, then runs the API tests and the browser tests
pnpm typecheck
pnpm fmt
```

The browser tests (`test/browser/`) drive Chromium through the pages: signing up and in, magic links, password
resets, the account tabs, two-factor end to end, passkeys with Chromium's virtual authenticator, and the admin. Any
console error or warning fails them, so a hydration mismatch does. They use `CHROMIUM_PATH`, a system Chromium or
Chrome, or Playwright's own (`npx playwright install chromium`); without one they're skipped.

On startup the playground seeds an admin (`admin@example.com` / `password123` by default) and 40 mock users from
`playground/.env`: join dates over six months, verified and unverified emails, two more admins, three bans
(permanent, expiring, expired), a moderator (`lucas.haddad@example.com`, for trying the playground's `moderator` role),
linked GitHub, Google and Discord accounts (some users have no password), and active sessions on different devices. Mock users share the admin's password. It only adds users that are missing, so delete
`playground/.data/auth.sqlite` to start over.

## License

MIT. The parts adapted from the Nuxt UI dashboard template keep its MIT notice; see [LICENSE](LICENSE).
