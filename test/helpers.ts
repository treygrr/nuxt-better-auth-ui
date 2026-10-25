import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inject } from 'vitest';

/** The playground server global-setup.ts started, shared by every test file. */
export const base = inject('base');
export const databasePath = inject('databasePath');

const playgroundDir = fileURLToPath(new URL('../playground', import.meta.url));
/** The playground's better-sqlite3, for the few things only the database can set up. */
export const Database = createRequire(join(playgroundDir, 'package.json'))('better-sqlite3');

/** A response's cookies, to send with the next request. */
export const cookiesOf = (response: Response) =>
    response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ');

/** The current code for an otpauth:// URI (or its base32 secret), as an authenticator app works it out (RFC 6238). */
export const totp = (uriOrSecret: string) => {
    const secret = uriOrSecret.startsWith('otpauth:') ? new URL(uriOrSecret).searchParams.get('secret')! : uriOrSecret;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bits = [...secret.replace(/=+$/, '')]
        .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
        .join('');
    const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
    const hmac = createHmac('sha1', key).update(counter).digest();
    const offset = hmac[hmac.length - 1]! & 0xf;
    return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
};

/** The newest email to an address (of a kind), waiting for it: emails are sent in the background. */
export async function waitForEmail(to: string, email?: string) {
    for (let tries = 0; tries < 50; tries++) {
        const found = (await outbox()).find((message) => message.to === to && (!email || message.email === email));
        if (found) return found;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const recent = (await outbox()).slice(0, 5).map((message) => `${message.email} to ${message.to}`);
    throw new Error(`No ${email ?? ''} email to ${to}; the latest: ${recent.join(', ')}`);
}

/** The first link in an email. */
export const linkIn = (message: { text: string }) => message.text.match(/https?:\/\/\S+/)![0];

/** The newest text to a number, waiting for it (sent in the background), newer than `after` if given. */
export async function waitForSms(to: string, after?: string) {
    for (let tries = 0; tries < 50; tries++) {
        const texts = (await (await fetch(`${base}/api/_playground/sms`)).json()) as Array<{
            to: string;
            text: string;
            code: string;
            sms: string;
            sentAt: string;
        }>;
        const found = texts.find((text) => text.to === to && (!after || text.sentAt > after));
        if (found) return found;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`No text to ${to}`);
}

/** The playground's outbox: the emails it "sent", newest first. */
export const outbox = async () =>
    (await (await fetch(`${base}/api/_playground/outbox`)).json()) as Array<{
        to: string;
        subject: string;
        text: string;
        html?: string;
        email: string;
    }>;
