# TODO

## Better Auth plugins: planned

Each follows the module's pattern: a `betterAuthUi` flag adds the plugin, the pages pick it up whether the module or
the app added it, the admin and configuration page show it, Spanish included.

7. **More sign-in providers**, including game platforms. See below.
8. **Organizations, what's left.** Every feature on Better Auth's Organization page is configurable and in the UI.
   Staff create organizations, add members, and create and remove teams (Better Auth's server-side calls), and sign
   in as the owner for the rest. Left: members' own organization actions in the audit log; editing members'
   additional fields (Better Auth has no endpoint for it).
9. **Stripe, what's left.** Done (and tested without reaching Stripe): the plugin, the billing tab, the admin's
   subscription card. Left: trying Checkout and the billing portal against Stripe's test mode; a plan filter on the
   users list (Better Auth's list-users can't filter by another table); a role while a plan is active (writing the
   Admin plugin's role from subscription hooks, without demoting staff); organization subscriptions.
10. **OAuth popup, what's left.** Done: `oauthPopup` on the sign-in pages, falling back to the redirect. Left: a
    component apps can embed (provider buttons that sign in through the popup); two-factor users get the code page
    inside the popup instead of the opener; Better Auth's docs for the plugin, when they appear.
11. **Single sign-on, what's left.** Done (tested with a mock OIDC provider, and a SAML sign-in end to end against a
    signing SAML identity provider, samlify, including a forged response being refused): the plugin, SSO on the
    sign-in page, the organization's SSO tab, the admin list. Left: providers of a user's own, outside an organization
    (Better Auth allows them; the page only manages organizations'); signing in by provider ID from a link
    (`/login?sso=<provider>`); private_key_jwt and SP keys in the form.

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

- **One-time token** (`one-time-token`): "Open in the app" hands a web session to a native or desktop client.
- **One Tap** (`one-tap`): Google's one-tap prompt on the sign-in page.

Not planned: SIWE (Ethereum), OIDC provider (being an identity provider for other apps), Better Auth
Infrastructure (`@better-auth/infra`: a hosted, paid service; apps add it themselves), OAuth proxy (a deployment concern with no UI), Open
API (developer docs; at most a link on the configuration page).

## Smaller follow-ups

- After 2026-10-26 16:15 UTC: remove `minimumReleaseAgeExclude` (`@nuxtjs/better-auth@0.3.13`) from
  pnpm-workspace.yaml.
- Publish: `private: true` and `0.0.0` in package.json; `scripts/release.mjs`.
- Install in neomons: remove its own sign-in pages (or set `pages.signIn: false`), set `appName`.
