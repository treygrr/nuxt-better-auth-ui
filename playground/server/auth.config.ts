import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { genericOAuth } from 'better-auth/plugins';
import { defineServerAuth } from '@nuxtjs/better-auth/config';
import { betterAuthEmails } from '@treygrr/nuxt-better-auth-ui/emails';
import { placeholderEmail } from '@treygrr/nuxt-better-auth-ui/providers';

const databasePath = process.env.AUTH_DATABASE_PATH || '.data/auth.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });

// GitHub sign-in, when its OAuth app credentials are in .env (https://better-auth.com/docs/authentication/github).
const github =
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
        : {};

// For the docs' screenshots (PLAYGROUND_DEMO=1): providers that show on the pages (their placeholder credentials don't
// sign anyone in) and an app name.
const demo = process.env.PLAYGROUND_DEMO === '1';
const demoProviders = demo
    ? Object.fromEntries(
          ['google', 'github', 'discord', 'apple'].map((id) => [id, { clientId: 'demo', clientSecret: 'demo' }])
      )
    : {};

// A stand-in OAuth provider for the tests (PLAYGROUND_MOCK_OAUTH=1), signing in whoever its authorize URL names
// (?email=). It goes through Better Auth's /callback/:providerId, as GitHub does.
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const mockOAuth =
    process.env.PLAYGROUND_MOCK_OAUTH === '1'
        ? [
              genericOAuth({
                  config: [
                      {
                          providerId: 'mock',
                          clientId: 'playground',
                          clientSecret: 'playground',
                          authorizationUrl: `${siteUrl}/api/_playground/oauth/authorize`,
                          tokenUrl: `${siteUrl}/api/_playground/oauth/token`,
                          pkce: false,
                          getUserInfo: async ({ accessToken }) => ({
                              id: accessToken!,
                              email: accessToken!,
                              name: accessToken!.split('@')[0]!,
                              emailVerified: true
                          })
                      },
                      // Like Epic Games and Battle.net: no email, so a placeholder, and the finish-account page.
                      {
                          providerId: 'mock-no-email',
                          clientId: 'playground',
                          clientSecret: 'playground',
                          authorizationUrl: `${siteUrl}/api/_playground/oauth/authorize`,
                          tokenUrl: `${siteUrl}/api/_playground/oauth/token`,
                          pkce: false,
                          getUserInfo: async ({ accessToken }) => ({
                              id: accessToken!,
                              email: placeholderEmail('mock-no-email', accessToken!),
                              name: accessToken!.split('@')[0]!,
                              emailVerified: false
                          })
                      }
                  ]
              })
          ]
        : [];

export default defineServerAuth({
    database: new Database(databasePath),
    // The screenshots' identity provider, registered without fetching from it.
    ...(demo && { appName: 'Acme', trustedOrigins: ['https://acme.okta.com'] }),
    socialProviders: { ...demoProviders, ...github },
    plugins: [...mockOAuth],
    // Auth emails through the module: templates and delivery are set in nuxt.config (betterAuthUi.emails).
    emailAndPassword: { enabled: true, sendResetPassword: betterAuthEmails.resetPassword },
    emailVerification: { sendVerificationEmail: betterAuthEmails.verifyEmail },
    // Account page features: changing email (approved from the current address) and deleting the account
    // (confirmed by email).
    user: {
        changeEmail: { enabled: true, sendChangeEmailConfirmation: betterAuthEmails.changeEmailConfirmation },
        deleteUser: { enabled: true, sendDeleteAccountVerification: betterAuthEmails.deleteAccount },
        // The app's own fields, which each user's admin page shows under "More details" (`plan` is server-owned).
        additionalFields: {
            company: { type: 'string', required: false },
            plan: { type: ['free', 'pro'], required: false, defaultValue: 'free', input: false },
            newsletter: { type: 'boolean', required: false, defaultValue: false },
            birthday: { type: 'date', required: false }
        }
    }
});
