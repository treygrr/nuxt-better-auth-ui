import { execSync, spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { TestProject } from 'vitest/node';

declare module 'vitest' {
    export interface ProvidedContext {
        /** The playground's address, eg http://localhost:3941. */
        base: string;
        /** Its SQLite file, for the few things only the database can set up (the first admin). */
        databasePath: string;
    }
}

const playgroundDir = fileURLToPath(new URL('../playground', import.meta.url));

/** Builds the playground once and starts it, for every test file: the API tests, then the browser tests. */
export default async function setup(project: TestProject) {
    const port = 3941;
    const base = `http://localhost:${port}`;
    const dataDir = mkdtempSync(join(tmpdir(), 'better-auth-ui-'));
    const databasePath = join(dataDir, 'auth.sqlite');

    // Without the .env's optional extras (set, so Nuxt's .env loading doesn't fill them in): no captcha, which API
    // sign-ups can't solve, no breached-password check (the tests use password123), and English.
    execSync('pnpm exec nuxt build', {
        cwd: playgroundDir,
        stdio: 'pipe',
        env: { ...process.env, PLAYGROUND_CAPTCHA_SITE_KEY: '', PLAYGROUND_HIBP: '', PLAYGROUND_LOCALE: '' }
    });
    // A throwaway signing key and certificate for the mock SAML identity provider, made for this run only.
    execSync(
        `openssl req -x509 -newkey rsa:2048 -nodes -subj /CN=playground-idp -days 1 -keyout ${join(dataDir, 'idp.key')} -out ${join(dataDir, 'idp.crt')}`,
        { stdio: 'ignore' }
    );
    const server: ChildProcess = spawn(process.execPath, ['.output/server/index.mjs'], {
        cwd: playgroundDir,
        env: {
            ...process.env,
            PORT: String(port),
            AUTH_DATABASE_PATH: databasePath,
            NUXT_APP_SECRET: 'playground-secret-at-least-32-characters-long',
            NUXT_PUBLIC_SITE_URL: base,
            PLAYGROUND_MOCK_OAUTH: '1',
            PLAYGROUND_SAML_IDP_KEY: readFileSync(join(dataDir, 'idp.key'), 'utf8'),
            PLAYGROUND_SAML_IDP_CERT: readFileSync(join(dataDir, 'idp.crt'), 'utf8')
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    await new Promise<void>((resolve, reject) => {
        const onData = (data: Buffer) => {
            output += data;
            if (output.includes('Listening on')) resolve();
        };
        server.stdout!.on('data', onData);
        server.stderr!.on('data', onData);
        server.once('exit', (code) => reject(new Error(`Server exited with ${code}:\n${output}`)));
    });

    project.provide('base', base);
    project.provide('databasePath', databasePath);

    return async () => {
        if (server.exitCode === null) {
            server.kill('SIGTERM');
            await once(server, 'exit');
        }
        rmSync(dataDir, { recursive: true, force: true });
    };
}
