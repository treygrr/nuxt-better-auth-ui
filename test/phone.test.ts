import { describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath, outbox, waitForSms } from './helpers';

// Phone numbers (betterAuthUi.phoneNumber, on in the playground with sign-ups), against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const userByPhone = (phone: string) =>
    new Database(databasePath)
        .prepare('select id, email, phoneNumberVerified from user where phoneNumber = ?')
        .get(phone) as { id: string; email: string; phoneNumberVerified: number } | undefined;

describe('phone numbers', () => {
    it('show in the capabilities', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.phoneNumber).toEqual({ otpLength: 6, signUp: true });
    });

    it('text a code in the app language, which signs a new number up', async () => {
        const phone = '+15550001111';
        expect((await auth('/phone-number/send-otp', { phoneNumber: phone })).status).toBe(200);
        const text = await waitForSms(phone);
        expect(text.sms).toBe('phone-code');
        // The code first, so phones offer to fill it in; then the app's name and how long it lasts.
        expect(text.text).toMatch(new RegExp(`^${text.code} is your .+ code\\. It expires in 5 minutes\\.`));

        const verify = await auth('/phone-number/verify', { phoneNumber: phone, code: text.code });
        expect(verify.status).toBe(200);
        expect(cookiesOf(verify)).toContain('session_token');
        expect(userByPhone(phone)).toMatchObject({ email: '15550001111@phone-number.invalid', phoneNumberVerified: 1 });

        // Signing in again later: the same account. The module never emails the generated address.
        const sentAt = new Date().toISOString();
        await auth('/phone-number/send-otp', { phoneNumber: phone });
        const again = await waitForSms(phone, sentAt);
        const second = await (await auth('/phone-number/verify', { phoneNumber: phone, code: again.code })).json();
        expect(second.user.id).toBe(userByPhone(phone)!.id);
        expect((await outbox()).some((email) => email.to.endsWith('.invalid'))).toBe(false);
    });

    it('refuse a wrong code', async () => {
        const phone = '+15550002222';
        await auth('/phone-number/send-otp', { phoneNumber: phone });
        await waitForSms(phone);
        const verify = await auth('/phone-number/verify', { phoneNumber: phone, code: '000000' });
        expect(verify.status).toBe(400);
        expect(userByPhone(phone)).toBeUndefined();
    });

    it('are added to an existing account, then removed', async () => {
        await auth('/sign-up/email', { name: 'Phil', email: 'phil@phone.test', password: 'password123' });
        const cookie = cookiesOf(await auth('/sign-in/email', { email: 'phil@phone.test', password: 'password123' }));
        const phone = '+15550003333';
        await auth('/phone-number/send-otp', { phoneNumber: phone }, cookie);
        const { code } = await waitForSms(phone);
        const verify = await auth(
            '/phone-number/verify',
            { phoneNumber: phone, code, updatePhoneNumber: true },
            cookie
        );
        expect(verify.status).toBe(200);
        expect(userByPhone(phone)).toMatchObject({ email: 'phil@phone.test', phoneNumberVerified: 1 });

        expect((await auth('/update-user', { phoneNumber: null }, cookie)).status).toBe(200);
        expect(userByPhone(phone)).toBeUndefined();
    });
});
