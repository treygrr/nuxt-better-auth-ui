import { describe, expect, it } from 'vitest';

import { base, cookiesOf, waitForEmail } from './helpers';

// Signing in with a code by email (betterAuthUi.emailOtp, on in the playground), against the built server.
const post = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const codeIn = (message: { subject: string }) => message.subject.match(/\d{6}$/)![0];

describe('email codes', () => {
    it('signs an existing user in with the emailed code, and refuses a wrong one', async () => {
        await post('/sign-up/email', { name: 'Coda', email: 'coda@otp.test', password: 'password123' });
        expect(
            (await post('/email-otp/send-verification-otp', { email: 'coda@otp.test', type: 'sign-in' })).status
        ).toBe(200);
        const email = await waitForEmail('coda@otp.test', 'email-code');
        expect(email.subject).toMatch(/^Your sign-in code: \d{6}$/);
        const code = codeIn(email);

        const wrong = await post('/sign-in/email-otp', {
            email: 'coda@otp.test',
            otp: code === '000000' ? '111111' : '000000'
        });
        expect((await wrong.json()).code).toBe('INVALID_OTP');

        const signIn = await post('/sign-in/email-otp', { email: 'coda@otp.test', otp: code });
        expect(signIn.status).toBe(200);
        const session = await (
            await fetch(`${base}/api/auth/get-session`, { headers: { cookie: cookiesOf(signIn) } })
        ).json();
        expect(session.user.email).toBe('coda@otp.test');

        // A code works once.
        expect((await post('/sign-in/email-otp', { email: 'coda@otp.test', otp: code })).status).not.toBe(200);
    });

    it('creates an account for a new email, as Better Auth does by default', async () => {
        await post('/email-otp/send-verification-otp', { email: 'fresh@otp.test', type: 'sign-in' });
        const code = codeIn(await waitForEmail('fresh@otp.test', 'email-code'));
        const signIn = await post('/sign-in/email-otp', { email: 'fresh@otp.test', otp: code });
        expect(signIn.status).toBe(200);
        expect((await signIn.json()).user.email).toBe('fresh@otp.test');
    });

    it('words password reset codes as such, since Better Auth can send those too', async () => {
        await post('/email-otp/request-password-reset', { email: 'coda@otp.test' });
        const email = await waitForEmail('coda@otp.test', 'email-code');
        expect(email.subject).toMatch(/^Your password reset code: \d{6}$/);
    });

    it('is listed in the capabilities, with its length', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.emailOtp).toEqual({ otpLength: 6 });
    });
});
