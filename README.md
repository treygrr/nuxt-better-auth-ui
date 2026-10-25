# @treygrr/nuxt-better-auth-admin

Admin pages for [Better Auth](https://better-auth.com) in Nuxt, built with [Nuxt UI](https://ui.nuxt.com). It adds
Better Auth's [Admin plugin](https://better-auth.com/docs/plugins/admin) to your app's auth and a dashboard at
`/admin` where users with the admin role manage other users.

The dashboard is the [Nuxt UI dashboard template](https://github.com/nuxt-ui-templates/dashboard) (MIT), brought in
whole: a collapsible sidebar with search, a home page with stats and a revenue chart, an inbox, a customers table,
settings pages and a notifications panel. Those pages still show the template's sample data, served from
`/api/_better-auth-admin/demo/*`; **Users** is the real thing, backed by Better Auth.

## User management

- **Home:** total users, sign-ups (against the previous period), active sessions and bans, a sign-ups chart by
  day, week or month over a chosen range, and the newest users. All from count queries on Better Auth's tables.
- **Users list:** search by email or name, filter (admins, banned, unverified), sort, paginate; select rows to ban or
  delete several at once.
- **Add user:** name, email, optional password, role.
- **Per user** (row menu or the user's page): edit name, email, avatar and verification; change role; set a password
  or email a reset link; ban with a reason and an expiry, or unban; sign out of one session or everywhere; delete.
- **User page:** profile, role and status, ban details, sign-in methods (email and password, Google, GitHub, …), and
  active sessions with device, IP and last activity.
- **Sign-in column** on the users list: an icon per method (key for email and password, GitHub, Google, …), so
  social-only users stand out. Fetched for the current page only, by user id, in one request.
- **Remove a sign-in method** from its menu, eg an old Google link, or their password. Like Better Auth's own
  unlink-account endpoint, the last one can't be removed (it would lock them out) unless the app sets
  `account.accountLinking.allowUnlinkingAll`.
- **Sign in as a user** (impersonation, opt-in with `impersonation: true`), from the row menu or their page, to see
  the app as they do. It uses Better Auth's impersonation: a one-hour session that keeps yours to return to, and
  marks it as an impersonation in their sessions list. Admins and banned users can't be impersonated. Put
  `<AdminImpersonationBanner />` in your app's layout (eg `app.vue`) for a "You're signed in as …" bar with
  **Stop impersonating**, which returns you to their admin page. With the option off, the module refuses Better
  Auth's impersonate-user endpoint too, since Better Auth's default admin role is otherwise allowed to use it.
- **Audit log** (on by default, `auditLog: false` to turn off): every successful admin action — creating, editing,
  banning and unbanning users, role and password changes, deletions, signing sessions out, impersonation and
  removing sign-in methods — with who did it, to whom (names and emails as they were, so deleted users stay
  readable), details such as the ban reason, IP and browser. Entries are kept for 30 days
  (`auditLogRetentionDays`; `0` keeps them forever): older ones are hidden and deleted as new ones are written. Its own **Audit log** page, filterable by action, and
  an **Activity** card on each user's page. It's a small Better Auth plugin that adds one table, `adminAuditLog`,
  through Better Auth's migrations (run them, or `npx @better-auth/cli generate` for Prisma or Drizzle); Better
  Auth's own tables aren't changed. A failed write is logged and never blocks the action.
- You can't ban, delete or change the role of your own account here; Better Auth also refuses self-bans.

> **Status: early.** Next: custom roles and permissions. The template's other pages still show sample data.

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

Install the icon sets the dashboard uses (Nuxt Icon looks for them in your app's dependencies):

```bash
pnpm add @iconify-json/lucide @iconify-json/simple-icons
```

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
        // Let admins sign in as a user (Better Auth's impersonation). Off, its endpoint is refused too.
        impersonation: false,
        // Record admin actions in an adminAuditLog table (added through Better Auth's migrations).
        auditLog: true,
        // Days the audit log keeps entries; 0 keeps them forever.
        auditLogRetentionDays: 30
    }
});
```

## How it works

- The module registers Better Auth's `admin()` and `adminClient()` plugins through `@nuxtjs/better-auth`'s
  `better-auth:plugins:extend` hook, so your auth config doesn't change.
- The pages use their own `better-auth-admin` layout, the dashboard template's sidebar layout, separate from your app's
  layouts. Its components are registered with an `Admin` prefix (`<AdminUserMenu>`, `<AdminHomeStats>`, …) so they
  can't clash with yours, and every runtime file imports from `#imports` explicitly, since Nuxt doesn't auto-import
  inside `node_modules`.
- It also installs [`@vueuse/nuxt`](https://vueuse.org/guide/#nuxt), which the template's pages use.
- Left out, because they belong to your app: the template's `app.vue`, `error.vue`, `app.config.ts` colours and CSS
  theme.
- Sign-in methods use the module's own routes, since the Admin plugin has none for them:
  `GET /api/_better-auth-admin/users/:id/accounts` (Better Auth's `user: ['get']` permission; returns provider, account
  ID, scope and dates, never passwords or tokens) and `DELETE …/accounts/:accountId` (`user: ['update']`).
  `GET /api/_better-auth-admin/accounts?userIds=a,b,…` returns `{ [userId]: providerIds }` for up to 100 users, in one
  query, for the users list.
- Route rules let only signed-in users with the admin role in; others are sent to the login page or get a 403. Better
  Auth checks the role again on every `/api/auth/admin/*` request.

## Development

```bash
pnpm install
cp playground/.env.example playground/.env
pnpm dev:prepare
pnpm dev         # the playground
pnpm test        # builds the module and the playground, then checks access control against the built server
pnpm typecheck
pnpm fmt
```

On startup the playground seeds an admin (`admin@example.com` / `password123` by default) and 40 mock users from
`playground/.env`: join dates over six months, verified and unverified emails, two more admins, three bans
(permanent, expiring, expired), linked GitHub, Google and Discord accounts (some users have no password), and active
sessions on different devices. Mock users share the admin's password. It only adds users that are missing, so delete
`playground/.data/auth.sqlite` to start over.

## License

MIT. The parts adapted from the Nuxt UI dashboard template keep its MIT notice; see [LICENSE](LICENSE).
