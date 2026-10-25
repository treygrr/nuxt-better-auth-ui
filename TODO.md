# TODO

## Better Auth plugins: planned

Each follows the module's pattern: a `betterAuthUi` flag adds the plugin, the pages pick it up whether the module or
the app added it, the admin and configuration page show it, Spanish included.

5. **Phone number** (`phone-number`). Sign in with an SMS code, verify a phone. Needs an SMS sender, like emails
   (`defineBetterAuthSmsSender`, SMS templates, Spanish). Costs money per message.
6. **Additional fields / custom session** (`additional-fields`, `custom-session`). Show (and let admins edit) the
   app's own user fields (eg a company, a plan, a region, a gamertag) on the admin user page, read from Better
   Auth's schema.
7. **More sign-in providers**, including game platforms. See below.
8. **Organizations** (`organization`). Better Auth's organizations as they are, for whatever an app uses them for
   (teams, workspaces, companies, groups): members with roles (owner, admin, member, or the app's own, through Better
   Auth's access control), invitations, leaving and removing members, and Better Auth's teams within an
   organization when the app turns them on. Account page: an "Organizations" tab (create, invitations to accept,
   switch the active organization). Admin: organization pages (members, roles, invitations, delete), a user's
   organizations on their page, audit-logged. Uses Better Auth's own words; apps rename them (eg "team", "workspace")
   by overriding the module's messages (below).
9. **Stripe** (`@better-auth/stripe`, its own package). Subscriptions: a "Billing" tab on the account page (current
   plan, upgrade or change, cancel, invoices through Stripe's customer portal), the plan on each user's admin page
   and a plan filter on the users list, and an option to give a role while a plan is active. Webhooks stay Better
   Auth's.
10. **OAuth popup** (`oauth-popup`). Provider sign-in in a popup instead of leaving the page, so someone signing in
    from inside a running app (an editor, a game, a checkout) keeps their state. An option on the sign-in pages (and
    a component apps can embed), falling back to the redirect where popups are blocked.

### More sign-in providers

| Platform | How | Notes |
| --- | --- | --- |
| **Twitch** | Built-in social provider (`socialProviders.twitch`) | Email with the `user:read:email` scope. Icon and label only. |
| **Apple** | Built-in social provider (`socialProviders.apple`) | Needs a paid Apple developer account; users may hide their email behind Apple's relay address (works, but it's not their real one). Apple's guidelines expect "Sign in with Apple" wherever other social sign-in is offered in iOS apps. |
| **Epic Games** | Generic OAuth (`genericOAuth`), Epic Account Services' OIDC discovery | **Epic doesn't share email addresses.** |
| **Battle.net** | Generic OAuth, Blizzard's OIDC discovery (`oauth.battle.net`, per region) | **No email either**: only the BattleTag. |
| **Xbox** | Built-in Microsoft provider (`socialProviders.microsoft`, consumers) | Signs in with the Microsoft account; the **gamertag** needs Xbox Live's own token exchange (user token, then XSTS) in a custom `getUserInfo`. Shown as "Xbox" with Xbox branding. |
| Steam | Not possible | OpenID 2.0, which Better Auth doesn't support. |

Work in the module:

- **Generic OAuth providers on the pages.** The sign-in and account pages only list `socialProviders`; they need the
  `genericOAuth` plugin's `providerId`s too (from its options, in the capabilities route).
- **Icons and labels** for Twitch, Apple, Epic, Battle.net, Xbox (and Roblox and Kick, built in too) in `providers.ts`.
- **Providers without an email** (Epic, Battle.net): Better Auth needs one per user. Options to decide between: ask
  for an email after the first sign-in (a "finish your account" step), or start them as a guest (Anonymous, above)
  and link the platform account to it. The admin shows the platform id (BattleTag, Epic display name) either way.
- **Provider helpers** the app can import, like Better Auth's own: `epicGames({ clientId, clientSecret })`,
  `battleNet({ clientId, clientSecret, region })`, `xbox({ clientId, clientSecret })` returning `GenericOAuthConfig`
  (or the Microsoft provider plus gamertag mapping), so apps don't hand-write endpoints.

## Better Auth plugins: maybe later

- **Multi-session** (`multi-session`): several accounts signed in at once, with a switcher (work and personal,
  shared devices).
- **One-time token** (`one-time-token`): "Open in the app" hands a web session to a native or desktop client.
- **One Tap** (`one-tap`): Google's one-tap prompt on the sign-in page.

Not planned: SIWE (Ethereum), SSO / OIDC provider (enterprise), OAuth proxy (a deployment concern with no UI), Open
API (developer docs; at most a link on the configuration page).

## Smaller follow-ups

- **Override the module's words**: a `betterAuthUi.messages` option (per language, any key) so apps can rename
  things ("Organizations" to "Teams", "Sign in" to "Log in") or add a language, without forking.
- Translate the module's own server error messages ("User not found", "Passkey not found", …), which admin toasts
  show in English. Better Auth's are translated by code already.
- Admin chart axis dates use English month names (date-fns `format`); format them with `Intl` in the page's language.
- `@nuxtjs/better-auth`'s SSR POST bug (issue #648, PR #649): when it's fixed, server-render the user page's sessions.
- Publish: `private: true` and `0.0.0` in package.json; `scripts/release.mjs`.
- Install in neomons: remove its own sign-in pages (or set `pages.signIn: false`), set `appName`.
