import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { defineServerAuth } from '@nuxtjs/better-auth/config';
import { betterAuthEmails } from '@treygrr/nuxt-better-auth-ui/emails';

const databasePath = process.env.AUTH_DATABASE_PATH || '.data/auth.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });

export default defineServerAuth({
    database: new Database(databasePath),
    // Auth emails through the module: templates and delivery are set in nuxt.config (betterAuthUi.emails).
    emailAndPassword: { enabled: true, sendResetPassword: betterAuthEmails.resetPassword },
    emailVerification: { sendVerificationEmail: betterAuthEmails.verifyEmail }
});
