# Options, and where each is documented

Each page lists the option's fields with their defaults, whether it needs a migration, and what it shows on the
pages. Base URL: https://treygrr.github.io/nuxt-better-auth-ui

| Option | Docs page |
| --- | --- |
| `pages`, `signOutRedirect` | /sign-in/pages |
| `twoFactor` | /sign-in/two-factor |
| `passkey` | /sign-in/passkeys |
| `username`, `magicLink`, `emailOtp`, `anonymous` | /sign-in/methods |
| `oauthPopup`, social providers, `@treygrr/nuxt-better-auth-ui/providers` | /sign-in/providers |
| `phoneNumber`, `sms` | /sign-in/phone-numbers |
| `deviceAuthorization` | /sign-in/devices |
| `captcha`, `haveIBeenPwned`, `securityAlerts` | /sign-in/security |
| `lastLoginMethod` | /sign-in/pages#last-used-method |
| `multiSession` | /sign-in/multi-session |
| `organization` | /organizations |
| `organization.statements`, `roles`, `dynamicRoles` | /organizations/roles |
| `sso` | /organizations/sso |
| `admin` | /admin, /admin/users, /admin/roles, /admin/audit-log |
| `stripe` | /integrations/stripe |
| `apiKey` | /integrations/api-keys |
| `bearer`, `jwt` | /integrations/tokens |
| `emails` | /customization/emails |
| `locale`, `messages` | /customization/languages |

## Package entries

| Import | What's in it |
| --- | --- |
| `@treygrr/nuxt-better-auth-ui` | The module |
| `@treygrr/nuxt-better-auth-ui/emails` | `betterAuthEmails`, `defineBetterAuthEmail`, `defineBetterAuthEmailSender` |
| `@treygrr/nuxt-better-auth-ui/sms` | `defineBetterAuthSmsSender` |
| `@treygrr/nuxt-better-auth-ui/providers` | `epicGames`, `battleNet`, `placeholderEmail` |
