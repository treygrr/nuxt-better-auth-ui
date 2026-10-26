---
name: nuxt-better-auth-ui
description: Use when configuring @treygrr/nuxt-better-auth-ui (the `betterAuthUi` key in nuxt.config.ts), turning its Better Auth features on, using its components and composables (AuthOrganizationSwitcher, AuthAccountSwitcher, useAuthActiveOrganization, useAuthDeviceAccounts), customizing its emails, words or pages, or calling its /api/_better-auth-ui routes.
---

# @treygrr/nuxt-better-auth-ui

Sign-in and sign-up pages, a self-service account page, organizations with SSO, and an admin dashboard, built with
Nuxt UI on top of `@nuxtjs/better-auth`. Full docs: https://treygrr.github.io/nuxt-better-auth-ui/

## How it works

- Everything is configured under `betterAuthUi` in `nuxt.config.ts`. Sign-in, account and admin pages are on by
  default; every other feature is off until turned on: `{ enabled: true, ... }` for plugins with options, `true`
  for the simple switches (`bearer`, `jwt`, `oauthPopup`, `haveIBeenPwned`, `lastLoginMethod`, `securityAlerts`).
- Turning a feature on **adds Better Auth's plugin for you**, on the server and the client, through
  `@nuxtjs/better-auth`'s `better-auth:plugins:extend` hook. Don't also add the same plugin to `server/auth.config.ts`
  or `app/auth.config.ts`. To use a plugin option the module doesn't pass through, leave the module's option off and
  add the plugin yourself: the pages read the set-up at runtime and pick it up.
- Features that add tables or columns need **Better Auth's migrations** run again. Each docs page says whether.
- Options that are functions (hooks, per-user limits) can't go in `nuxt.config.ts`: put them in a file and point the
  feature's `serverOptions` at it (default export, merged last).
- Secrets come from the environment, never `nuxt.config.ts`: `BETTER_AUTH_CAPTCHA_SECRET_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`.

## Features and their options

| Option | Feature | Extra package |
| --- | --- | --- |
| `twoFactor` | Authenticator app, email codes (`otp`), backup codes; `required` for everyone or some roles | |
| `passkey` | Passkeys | `@better-auth/passkey` |
| `username`, `magicLink`, `emailOtp`, `anonymous` | Sign-in methods | |
| `multiSession` | Several accounts per browser | |
| `phoneNumber`, `sms` | Phone numbers | |
| `deviceAuthorization` | Signing in devices (TVs, CLIs) | |
| `oauthPopup`, `captcha`, `haveIBeenPwned`, `lastLoginMethod`, `securityAlerts` | Sign-in extras | |
| `organization` | Organizations, members, invitations, teams, roles | |
| `sso` | OIDC and SAML single sign-on per organization | `@better-auth/sso` |
| `stripe` | Subscriptions | `@better-auth/stripe`, `stripe` |
| `apiKey`, `bearer`, `jwt` | API keys and tokens | `@better-auth/api-key` (API keys) |
| `emails` | Sending Better Auth's emails with the module's templates | |
| `pages`, `signOutRedirect`, `locale`, `messages`, `admin` | General | |

Per-option details: [references/options.md](references/options.md).

## In the app

- `<AuthOrganizationSwitcher />` and `useAuthActiveOrganization()`: the active organization, server-rendered. Only
  registered with `organization` on (and its pages): guard their use in the app with the same option.
- `<AuthAccountSwitcher />` and `useAuthDeviceAccounts()`: the accounts signed in on this browser. Always registered;
  they show nothing without multi-session.
- `<AdminImpersonationBanner />`: "You're signed in as …" while staff impersonate. Only registered with the admin
  dashboard on (`admin.enabled`, the default); it renders nothing otherwise.
- The module's own pages use components prefixed `BetterAuthUi*` and composables `useBetterAuthAdmin*`: internal,
  not for the app.

## Rules

- **Better Auth does the checking.** For your own server routes, check permissions with Better Auth's API
  (`serverAuth(event).api.hasPermission`, `userHasPermission`), not by reading roles yourself.
- **Never write Better Auth's tables directly**, and don't replace its endpoints. The module only adds its own tables
  (audit log, activity, staff notes) through Better Auth's migrations.
- **Words** are changed with `messages` (per locale and key), not by overriding pages. Error codes from Better Auth
  and the module's routes are translated as `errors.<CODE>`.
- **Emails** go through `emails.send` (a file exporting a sender) and `emails.templates`; `betterAuthEmails` from
  `@treygrr/nuxt-better-auth-ui/emails` gives ready-made Better Auth email callbacks.
- **Tailwind** must scan the module: `@source "../../../node_modules/@treygrr/nuxt-better-auth-ui/dist/runtime";` in
  the main CSS file.
- **Serverless hosts:** set Better Auth's `advanced.backgroundTasks.handler` (for example Vercel's `waitUntil`) so
  emails, texts and the audit log's writes finish after the response.
- The first admin is set in the database (`role = 'admin'`); after that, from the dashboard.
