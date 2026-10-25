import { beforeAll, describe, expect, it } from 'vitest';

import { parseCsv } from '../src/runtime/csv';
import { base, cookiesOf, Database, databasePath, waitForEmail } from './helpers';

// Exporting users to CSV and importing them, against the built playground.
const json = { 'content-type': 'application/json', origin: base };
const signUp = async (name: string, role?: string) => {
    const email = `${name}@csv.test`;
    await fetch(`${base}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ name, email, password: 'password123' })
    });
    if (role) new Database(databasePath).prepare('update user set role = ? where email = ?').run(role, email);
    return cookiesOf(
        await fetch(`${base}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: json,
            body: JSON.stringify({ email, password: 'password123' })
        })
    );
};
const importRows = (cookie: string, rows: Array<Record<string, string>>, sendPasswordLinks = false) =>
    fetch(`${base}/api/_better-auth-ui/users/import`, {
        method: 'POST',
        headers: { ...json, cookie },
        body: JSON.stringify({ rows: rows.map((values, index) => ({ row: index + 2, values })), sendPasswordLinks })
    });
const user = (email: string) =>
    new Database(databasePath).prepare('select * from user where email = ?').get(email) as
        Record<string, unknown> | undefined;

let adminCookie: string;
let moderatorCookie: string;

beforeAll(async () => {
    adminCookie = await signUp('csvadmin', 'admin');
    moderatorCookie = await signUp('csvmoderator', 'moderator');
    // A name a spreadsheet would run as a formula.
    await fetch(`${base}/api/auth/admin/create-user`, {
        method: 'POST',
        headers: { ...json, cookie: adminCookie },
        body: JSON.stringify({ name: '=HYPERLINK("https://evil.test")', email: 'formula@csv.test' })
    });
});

describe('exporting users', () => {
    it('is for staff, and gives every user as CSV with their fields and sign-in methods', async () => {
        expect((await fetch(`${base}/api/_better-auth-ui/users/export`)).status).toBe(401);
        const response = await fetch(`${base}/api/_better-auth-ui/users/export`, { headers: { cookie: adminCookie } });
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/csv');
        expect(response.headers.get('content-disposition')).toMatch(
            /attachment; filename="users-\d{4}-\d{2}-\d{2}\.csv"/
        );

        const [header, ...rows] = parseCsv(await response.text());
        // The import's columns first, then the app's own fields, the plugins' and Better Auth's.
        expect(header!.slice(0, 6)).toEqual(['name', 'email', 'emailVerified', 'role', 'username', 'displayUsername']);
        expect(header).toEqual(
            expect.arrayContaining(['company', 'plan', 'newsletter', 'birthday', 'banned', 'signInMethods'])
        );
        expect(header).not.toContain('password');
        const admin = rows.find((row) => row[1] === 'csvadmin@csv.test')!;
        expect(admin[3]).toBe('admin');
        expect(admin.at(-1)).toBe('credential');
    });

    it('escapes text a spreadsheet would run, and records the export in the audit log', async () => {
        const csv = await (
            await fetch(`${base}/api/_better-auth-ui/users/export`, { headers: { cookie: adminCookie } })
        ).text();
        expect(csv).toContain(`"'=HYPERLINK(""https://evil.test"")"`);
        const entry = new Database(databasePath)
            .prepare("select * from adminAuditLog where action = 'users.export' order by createdAt desc")
            .get() as { actorEmail: string; details: string };
        expect(entry.actorEmail).toBe('csvadmin@csv.test');
        expect(JSON.parse(entry.details).count).toBeGreaterThan(2);
    });
});

describe('importing users', () => {
    it('needs the user: create permission', async () => {
        expect((await importRows(moderatorCookie, [{ email: 'nope@csv.test' }])).status).toBe(403);
    });

    it('creates users through Better Auth, skipping existing emails and saying why rows failed', async () => {
        const response = await importRows(
            adminCookie,
            [
                { email: 'Ada@CSV.test', name: 'Ada', password: 'password123', role: 'moderator' },
                {
                    email: 'grace@csv.test',
                    name: 'Grace',
                    username: 'Grace_H',
                    newsletter: 'yes',
                    birthday: '1990-12-09'
                },
                { email: 'csvadmin@csv.test', name: 'Already here' },
                { email: 'grace@csv.test', name: 'Twice' },
                { email: 'not-an-email', name: 'Broken' },
                { email: 'short@csv.test', password: 'short' },
                { email: 'ghost@csv.test', role: 'ghost' }
            ],
            true
        );
        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result.created.map((item: { email: string }) => item.email)).toEqual(['ada@csv.test', 'grace@csv.test']);
        expect(result.skipped).toEqual([
            expect.objectContaining({ row: 4, code: 'USER_ALREADY_EXISTS' }),
            expect.objectContaining({ row: 5, code: 'IMPORT_DUPLICATE_ROW' })
        ]);
        expect(result.failed.map((item: { row: number; code: string }) => [item.row, item.code])).toEqual([
            [6, 'INVALID_EMAIL'],
            [7, 'IMPORT_PASSWORD_LENGTH'],
            [8, 'YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE']
        ]);

        // As Better Auth stores them: the role, the username lowercased and as typed, the app's fields in their types.
        expect(user('ada@csv.test')).toMatchObject({ name: 'Ada', role: 'moderator' });
        expect(user('grace@csv.test')).toMatchObject({
            username: 'grace_h',
            displayUsername: 'Grace_H',
            newsletter: 1
        });
        expect(user('ghost@csv.test')).toBeUndefined();
        // A password signs in; no password, a link to set one.
        const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: json,
            body: JSON.stringify({ email: 'ada@csv.test', password: 'password123' })
        });
        expect(signIn.status).toBe(200);
        expect(result.linksSent).toBe(1);
        await waitForEmail('grace@csv.test', 'reset-password');
        // Each user created is in the audit log, as by hand.
        const created = new Database(databasePath)
            .prepare(
                "select targetEmail from adminAuditLog where action = 'user.create' and actorEmail = 'csvadmin@csv.test'"
            )
            .all()
            .map((row: { targetEmail: string }) => row.targetEmail);
        expect(created).toEqual(expect.arrayContaining(['ada@csv.test', 'grace@csv.test']));
    });

    it('takes at most 1000 rows', async () => {
        const rows = Array.from({ length: 1001 }, (_, index) => ({ email: `many${index}@csv.test` }));
        const response = await importRows(adminCookie, rows);
        expect(response.status).toBe(400);
        expect((await response.json()).data.code).toBe('IMPORT_ROWS_INVALID');
    });
});
