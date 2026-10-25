import { describe, expect, it } from 'vitest';

import { safeLocalPath } from '../src/runtime/app/utils/redirect';

describe('after-sign-in redirects', () => {
    it('allows paths on this site', () => {
        for (const path of ['/', '/admin/users', '/account?tab=security', '/a/b#c'])
            expect(safeLocalPath(path)).toBe(path);
    });

    it('refuses anything that could leave the site', () => {
        for (const path of [
            'https://evil.test',
            '//evil.test',
            '/\\evil.test',
            '/%2f%2fevil.test',
            '/%5c%5cevil.test',
            'javascript:alert(1)',
            '/ok\nLocation: https://evil.test',
            '',
            undefined,
            ['/admin']
        ]) {
            expect(safeLocalPath(path), String(path)).toBeUndefined();
        }
    });
});
