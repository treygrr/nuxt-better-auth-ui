import { describe, expect, it } from 'vitest';

import { renderEmail } from '../src/runtime/server/emails/index';
import { EMAIL_NAMES } from '../src/runtime/server/emails/types';
import { defaultEmails } from '../src/runtime/server/emails/defaults';

const user = { id: 'u', name: 'Ana', email: 'ana@example.com', emailVerified: true };

describe('default emails', () => {
    it('come in English and Spanish, for every email', () => {
        for (const locale of ['en', 'es'] as const) {
            expect(Object.keys(defaultEmails[locale]).sort(), locale).toEqual([...EMAIL_NAMES].sort());
        }
    });

    it('follow betterAuthUi.locale', async () => {
        const data = { user, url: 'https://example.com/verify', token: 't' };
        expect((await renderEmail('verify-email', data)).subject).toBe('Verify your email address');
        const spanish = await renderEmail('verify-email', data, undefined, 'es');
        expect(spanish.subject).toBe('Verifica tu correo');
        expect(spanish.text).toContain('Hola, Ana:');
        expect(spanish.text).toContain('https://example.com/verify');
    });

    it('send sign-in links to the address asked for, which may have no account yet', async () => {
        const email = await renderEmail(
            'magic-link',
            { email: 'new@example.com', url: 'https://x/link', token: 't' },
            undefined,
            'es'
        );
        expect(email.subject).toBe('Tu enlace para iniciar sesión');
        expect(email.text).toContain('https://x/link');
    });
});
