import { existsSync } from 'node:fs';

import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core';
import { afterAll } from 'vitest';

import { base } from '../helpers';

/**
 * Chromium for the browser tests: CHROMIUM_PATH, a system Chromium or Chrome, or Playwright's own
 * (`npx playwright install chromium`). Without one, the browser tests are skipped.
 */
const executablePath =
    process.env.CHROMIUM_PATH ??
    ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((path) => existsSync(path));

let browser: Browser | undefined;
let available = true;
try {
    browser = await chromium.launch({ executablePath });
} catch (error) {
    available = false;
    console.warn(`[browser tests] No Chromium, skipping: ${(error as Error).message.split('\n')[0]}`);
}
export const hasBrowser = available;

afterAll(async () => {
    await browser?.close();
});

/** Console errors and warnings (other than expected 4xx responses) and page errors: a hydration mismatch shows here. */
export type Problems = string[];

/**
 * A fresh browser context (no cookies) and page, collecting problems. `go(path)` loads a page and waits for it to
 * hydrate; `path()` is where it is now.
 */
export async function openPage(options: { viewport?: { width: number; height: number }; locale?: string } = {}) {
    const context: BrowserContext = await browser!.newContext({
        viewport: options.viewport ?? { width: 1280, height: 1000 },
        locale: options.locale
    });
    const page: Page = await context.newPage();
    const problems: Problems = [];
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
        if (!['error', 'warning'].includes(message.type()) || /\b40\d\b/.test(message.text())) return;
        problems.push(`[${new URL(page.url()).pathname}] ${message.text().slice(0, 300)}`);
    });
    return {
        context,
        page,
        problems,
        async go(path: string) {
            await page.goto(`${base}${path}`, { waitUntil: 'load' });
            // Hydration, and data fetched in the browser.
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.waitForTimeout(500);
        },
        path: () => new URL(page.url()).pathname,
        /** Stops the passkey prompt the sign-in page opens on its own (browser autofill) from signing straight in. */
        noPasskeyAutofill: () =>
            context.addInitScript(() => {
                PublicKeyCredential.isConditionalMediationAvailable = async () => false;
            })
    };
}

/** Signs up through Better Auth's API (faster than the form, which its own test covers). */
export async function signUp(name: string, email: string, password = 'password123') {
    const response = await fetch(`${base}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base },
        body: JSON.stringify({ name, email, password })
    });
    if (!response.ok) throw new Error(`Sign-up failed: ${await response.text()}`);
}

/** Signs in through the sign-in page, then waits to land on `to`. */
export async function signInWithForm(
    session: Awaited<ReturnType<typeof openPage>>,
    email: string,
    to: string,
    password = 'password123'
) {
    await session.noPasskeyAutofill();
    await session.go(`/login?redirect=${encodeURIComponent(to)}`);
    await session.page.getByLabel(/^Email/).fill(email);
    await session.page.getByLabel('Password', { exact: true }).fill(password);
    await session.page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await session.page.waitForURL((url) => url.pathname === to.split('?')[0], { timeout: 10_000 });
}

/** Holds a test file's browser open for its tests; closes contexts it opened. */
export function useBrowser() {
    const contexts: BrowserContext[] = [];
    afterAll(async () => {
        await Promise.all(contexts.map((context) => context.close()));
    });
    return {
        async open(options?: Parameters<typeof openPage>[0]) {
            const session = await openPage(options);
            contexts.push(session.context);
            return session;
        }
    };
}
