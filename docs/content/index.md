---
seo:
  title: Nuxt Better Auth UI
  description: Sign-in pages, a self-service account page, organizations and an admin dashboard for Better Auth in Nuxt, built with Nuxt UI.
---

::u-page-hero{class="dark:bg-gradient-to-b from-neutral-900 to-neutral-950"}
---
orientation: horizontal
---
#top
:hero-background

#title
Auth UI for [Better Auth]{.text-primary} in Nuxt.

#description
Sign-in and sign-up pages, a self-service account page, organizations with single sign-on, and an admin dashboard for your users, all built with Nuxt UI and backed by Better Auth. Turn features on in `nuxt.config.ts`.

#links
  :::u-button
  ---
  to: /getting-started
  size: xl
  trailing-icon: i-lucide-arrow-right
  ---
  Get started
  :::

  :::u-button
  ---
  icon: i-simple-icons-github
  color: neutral
  variant: outline
  size: xl
  to: https://github.com/treygrr/nuxt-better-auth-ui
  target: _blank
  ---
  View on GitHub
  :::

#default
  :screenshot{name="admin-home" alt="The admin dashboard's home page: users, sign-ups, sessions and bans, with a sign-ups chart" eager}
::

::u-page-section{class="dark:bg-neutral-950"}
#title
Every page around Better Auth

#description
For the people using your app, and the staff running it. Each page shows only what your Better Auth set-up supports.

#default
  :::screenshot-gallery
  ---
  items:
    - name: sign-in
      title: Sign-in pages
      description: Passwords, providers, passkeys, links, codes, SSO and guests.
      to: /sign-in/pages
    - name: account
      title: Account page
      description: Profile, security, devices, keys, billing and their data.
      to: /sign-in/account
    - name: organization
      title: Organizations
      description: Members and their roles, invitations, teams and custom roles.
      to: /organizations
    - name: organization-sso
      title: Single sign-on
      description: OIDC and SAML providers, with domain verification.
      to: /organizations/sso
    - name: admin-users
      title: Managing users
      description: Search, filter, ban, impersonate, and help locked-out users.
      to: /admin/users
    - name: admin-audit
      title: Audit log
      description: Every admin action and users' sign-ins, with who and when.
      to: /admin/audit-log
  ---
  :::
::

::u-page-section{class="dark:bg-neutral-950"}
#title
Everything around Better Auth, ready to use

#features
  :::u-page-feature
  ---
  icon: i-lucide-log-in
  ---
  #title
  Sign-in pages

  #description
  Passwords, passkeys, sign-in links, codes by email or text, social providers and single sign-on, with two-factor and captcha.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-user-cog
  ---
  #title
  Account page

  #description
  Profile, email, password, two-factor, passkeys, devices, connected accounts, API keys, billing and data download.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-building-2
  ---
  #title
  Organizations

  #description
  Members, invitations, teams, custom roles and SSO providers, each shown to those whose role allows it.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-layout-dashboard
  ---
  #title
  Admin dashboard

  #description
  Users, sessions, bans, impersonation, an audit log, staff notes and a read-only view of your set-up.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-mail
  ---
  #title
  Emails

  #description
  Verification, password reset, invitations and security alerts, with your own templates and delivery.
  :::

  :::u-page-feature
  ---
  icon: i-lucide-languages
  ---
  #title
  Your words, your language

  #description
  English and Spanish built in, and any word can be renamed per language.
  :::
::

::u-page-section{class="dark:bg-neutral-950"}
---
orientation: horizontal
---
#title
Turn on what you need

#description
Each feature is one line in `nuxt.config.ts`. The module adds Better Auth's plugin for it, and the pages show it.

#links
  :::u-button
  ---
  to: /getting-started/configuration
  color: neutral
  variant: subtle
  trailing-icon: i-lucide-arrow-right
  ---
  See every option
  :::

#default
  :::prose-pre
  ---
  code: |
    export default defineNuxtConfig({
      modules: ['@treygrr/nuxt-better-auth-ui'],
      betterAuthUi: {
        twoFactor: { enabled: true },
        passkey: { enabled: true },
        organization: { enabled: true },
        sso: { enabled: true }
      }
    })
  filename: nuxt.config.ts
  ---

  ```ts [nuxt.config.ts]
  export default defineNuxtConfig({
    modules: ['@treygrr/nuxt-better-auth-ui'],
    betterAuthUi: {
      twoFactor: { enabled: true },
      passkey: { enabled: true },
      organization: { enabled: true },
      sso: { enabled: true }
    }
  })
  ```
  :::
::
