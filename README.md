# @treygrr/nuxt-better-auth-ui

Auth UI for [Better Auth](https://better-auth.com) in Nuxt, built with [Nuxt UI](https://ui.nuxt.com).

**[Documentation](https://treygrr.github.io/nuxt-better-auth-ui/)**

- **Sign-in pages:** sign in, sign up, password resets and two-factor, with passkeys, sign-in links, codes by email or
  text, social and game providers, guests and single sign-on when you turn them on.
- **An account page** where people manage their profile, email, password, two-factor, passkeys, devices, connected
  accounts, API keys, billing and data download.
- **Organizations:** members, invitations, teams, custom roles and SSO providers.
- **An admin dashboard** at `/admin`: users, sessions, bans, staff roles, impersonation, an audit log and staff notes,
  through Better Auth's [Admin plugin](https://better-auth.com/docs/plugins/admin).
- **Auth emails** through your own provider, with your own templates.
- **English and Spanish**, and any word renamed.

Everything is configured under `betterAuthUi` in `nuxt.config.ts`. When a feature needs a Better Auth plugin, the
module adds it for you.

## Quick start

```bash
pnpm add @treygrr/nuxt-better-auth-ui @iconify-json/lucide @iconify-json/simple-icons
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ['@treygrr/nuxt-better-auth-ui'],
    betterAuthUi: {
        twoFactor: { enabled: true },
        passkey: { enabled: true }
    }
});
```

Then point Tailwind at the module's pages, run Better Auth's migrations, and give yourself the admin role: see
[Installation](https://treygrr.github.io/nuxt-better-auth-ui/getting-started/installation).

## Documentation

| | |
| --- | --- |
| [Getting started](https://treygrr.github.io/nuxt-better-auth-ui/getting-started) | Installation, and every option at a glance |
| [Sign-in](https://treygrr.github.io/nuxt-better-auth-ui/sign-in/pages) | The pages, the account page, every sign-in method, two-factor, passkeys, security |
| [Organizations](https://treygrr.github.io/nuxt-better-auth-ui/organizations) | Organizations, roles and permissions, single sign-on |
| [Admin dashboard](https://treygrr.github.io/nuxt-better-auth-ui/admin) | Managing users, staff roles, the audit log |
| [Integrations](https://treygrr.github.io/nuxt-better-auth-ui/integrations/stripe) | Stripe, API keys, bearer tokens and JWTs |
| [Customization](https://treygrr.github.io/nuxt-better-auth-ui/customization/emails) | Emails, languages and your own words |

## Development

```bash
pnpm install
cp playground/.env.example playground/.env
pnpm dev:prepare
pnpm dev         # the playground
pnpm test        # builds the module and the playground, starts it once, then runs the API tests and the browser tests
pnpm typecheck
pnpm fmt
pnpm docs:dev      # the documentation site (docs/), on http://localhost:3002
pnpm docs:generate # its static build, as GitHub Pages serves it
```

The repository is a pnpm workspace: the module at the root, `playground/` and `docs/` (the documentation site, made
with Nuxt Content from the Nuxt UI docs template). Pushes to `main` that change `docs/` publish it to GitHub Pages
(`.github/workflows/docs.yml`).

The browser tests (`test/browser/`) drive Chromium through the pages: signing up and in, magic links, password
resets, the account tabs, two-factor end to end, passkeys with Chromium's virtual authenticator, organizations, single
sign-on and the admin. Any console error or warning fails them, so a hydration mismatch does. They use
`CHROMIUM_PATH`, a system Chromium or Chrome, or Playwright's own (`npx playwright install chromium`); without one
they're skipped.

On startup the playground seeds an admin (`admin@example.com` / `password123` by default) and 40 mock users from
`playground/.env`: join dates over six months, verified and unverified emails, two more admins, three bans
(permanent, expiring, expired), a moderator (`lucas.haddad@example.com`, for trying the playground's `moderator` role),
linked GitHub, Google and Discord accounts (some users have no password), and active sessions on different devices.
Mock users share the admin's password. It only adds users that are missing, so delete `playground/.data/auth.sqlite`
to start over.

## License

MIT. The parts adapted from the Nuxt UI dashboard template keep its MIT notice; see [LICENSE](LICENSE).
