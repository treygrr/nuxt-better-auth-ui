import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { defineServerAuth } from '@nuxtjs/better-auth/config';
import { betterAuthEmails } from '@treygrr/nuxt-better-auth-ui/emails';

const databasePath = process.env.AUTH_DATABASE_PATH || '.data/auth.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });

// GitHub sign-in, when its OAuth app credentials are in .env (https://better-auth.com/docs/authentication/github).
const github =
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
        ? { github: { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET } }
        : {};

export default defineServerAuth({
    database: new Database(databasePath),
    socialProviders: { ...github },
    // Auth emails through the module: templates and delivery are set in nuxt.config (betterAuthUi.emails).
    emailAndPassword: { enabled: true, sendResetPassword: betterAuthEmails.resetPassword },
    emailVerification: { sendVerificationEmail: betterAuthEmails.verifyEmail },
    // Account page features: changing email (approved from the current address) and deleting the account
    // (confirmed by email).
    user: {
        changeEmail: { enabled: true, sendChangeEmailConfirmation: betterAuthEmails.changeEmailConfirmation },
        deleteUser: { enabled: true, sendDeleteAccountVerification: betterAuthEmails.deleteAccount }
    }
});
