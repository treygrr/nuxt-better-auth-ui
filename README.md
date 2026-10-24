# @treygrr/nuxt-better-auth-admin

Admin pages for [Better Auth](https://better-auth.com) in Nuxt, built with [Nuxt UI](https://ui.nuxt.com). It adds
Better Auth's [Admin plugin](https://better-auth.com/docs/plugins/admin) to your app's auth and a dashboard at
`/admin` where users with the admin role manage other users.

> **Status: scaffold.** The users list works; user details, roles, bans, sessions and impersonation are next.

## Setup

```bash
pnpm add @treygrr/nuxt-better-auth-admin
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ['@treygrr/nuxt-better-auth-admin']
});
```

It depends on [`@nuxt/ui`](https://ui.nuxt.com) and [`@nuxtjs/better-auth`](https://better-auth.nuxt.dev), and installs
them for you through Nuxt's [module dependencies](https://nuxt.com/docs/4.x/guide/modules/module-dependencies). Your app
still needs its own Better Auth config (`server/auth.config.ts`, `app/auth.config.ts`).

Tailwind doesn't scan `node_modules`, so point it at the admin pages in your main CSS file:

```css
@import 'tailwindcss';
@import '@nuxt/ui';

@source "../../../node_modules/@treygrr/nuxt-better-auth-admin/dist/runtime";
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
    betterAuthAdmin: {
        // Where the admin pages live.
        route: '/admin',
        // The role that may use the admin pages and Better Auth's admin endpoints.
        role: 'admin',
        // Show "impersonate user" in the admin pages.
        impersonation: false
    }
});
```

## How it works

- The module registers Better Auth's `admin()` and `adminClient()` plugins through `@nuxtjs/better-auth`'s
  `better-auth:plugins:extend` hook, so your auth config doesn't change.
- The pages use their own `better-auth-admin` layout, a Nuxt UI dashboard with a sidebar, separate from your app's
  layouts.
- Route rules let only signed-in users with the admin role in; others are sent to the login page or get a 403. Better
  Auth checks the role again on every `/api/auth/admin/*` request.

## Development

```bash
pnpm install
pnpm dev:prepare
pnpm dev         # the playground
pnpm test        # builds the module and the playground, then checks access control against the built server
pnpm typecheck
pnpm fmt
```

## License

MIT
