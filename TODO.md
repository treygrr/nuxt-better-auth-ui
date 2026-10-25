# TODO

## Better Auth plugins: planned

Each follows the module's pattern: a `betterAuthUi` flag adds the plugin, the pages pick it up whether the module or
the app added it, the admin and configuration page show it, Spanish included.

7. **More sign-in providers**, including game platforms. See below.
8. **Organizations, what's left.** Done: the plugin, the account tab, the invitation page, admin pages (read-only).
   Left: a UI for Better Auth's teams; the app's own organization roles (dynamic access control) in the role pickers,
   which show Better Auth's defaults; staff changing organizations (Better Auth has no admin endpoints for them, and
   writing its tables directly would bypass its hooks); organization actions in the audit log.
9. **Stripe, what's left.** Done (and tested without reaching Stripe): the plugin, the billing tab, the admin's
   subscription card. Left: trying Checkout and the billing portal against Stripe's test mode; a plan filter on the
   users list (Better Auth's list-users can't filter by another table); a role while a plan is active (writing the
   Admin plugin's role from subscription hooks, without demoting staff); organization subscriptions.
10. **OAuth popup, what's left.** Done: `oauthPopup` on the sign-in pages, falling back to the redirect. Left: a
    component apps can embed (provider buttons that sign in through the popup); two-factor users get the code page
    inside the popup instead of the opener; Better Auth's docs for the plugin, when they appear.

### More sign-in providers

| Platform | How | Notes |
| --- | --- | --- |
| **Twitch** | Built-in social provider (`socialProviders.twitch`) | Email with the `user:read:email` scope. Icon and label only. |
| **Apple** | Built-in social provider (`socialProviders.apple`) | Needs a paid Apple developer account; users may hide their email behind Apple's relay address (works, but it's not their real one). Apple's guidelines expect "Sign in with Apple" wherever other social sign-in is offered in iOS apps. |
| **Epic Games** | Generic OAuth (`genericOAuth`), Epic Account Services' OIDC discovery | **Epic doesn't share email addresses.** |
| **Battle.net** | Generic OAuth, Blizzard's OIDC discovery (`oauth.battle.net`, per region) | **No email either**: only the BattleTag. |
| **Xbox** | Built-in Microsoft provider (`socialProviders.microsoft`, consumers) | Signs in with the Microsoft account; the **gamertag** needs Xbox Live's own token exchange (user token, then XSTS) in a custom `getUserInfo`. Shown as "Xbox" with Xbox branding. |
| Steam | Not possible | OpenID 2.0, which Better Auth doesn't support. |

Done: Generic OAuth providers on the pages, icons and labels, `epicGames` and `battleNet` helpers, and the
finish-account page for providers without an email. Left:

- **Xbox**: the Microsoft provider shown as Xbox, with the gamertag from Xbox Live's token exchange (user token, then
  XSTS) in a custom `getUserInfo`.
- Trying the Epic Games and Battle.net helpers against the real services.

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
