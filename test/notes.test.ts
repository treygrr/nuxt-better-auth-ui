import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath, totp } from './helpers';

// Staff notes on users (betterAuthUi.admin.notes, on in the playground), against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const notes = (userId: string, cookie: string, init: { method?: string; body?: unknown; noteId?: string } = {}) =>
    fetch(`${base}/api/_better-auth-ui/users/${userId}/notes${init.noteId ? `/${init.noteId}` : ''}`, {
        method: init.method ?? 'GET',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: init.body === undefined ? undefined : JSON.stringify(init.body)
    });

const signUp = async (name: string) => {
    const email = `${name}@notes.test`;
    expect((await auth('/sign-up/email', { name, email, password: 'password123' })).status).toBe(200);
    return (new Database(databasePath).prepare('select id from user where email = ?').get(email) as { id: string }).id;
};
const signIn = async (name: string) =>
    cookiesOf(await auth('/sign-in/email', { email: `${name}@notes.test`, password: 'password123' }));

let adminCookie: string;
let moderatorCookie: string;
let userCookie: string;
let userId: string;

beforeAll(async () => {
    userId = await signUp('noted');
    await signUp('notesadmin');
    const moderatorId = await signUp('notesmod');
    const db = new Database(databasePath);
    db.prepare("update user set role = 'admin' where email = 'notesadmin@notes.test'").run();
    db.prepare("update user set role = 'moderator' where id = ?").run(moderatorId);
    adminCookie = await signIn('notesadmin');
    userCookie = await signIn('noted');
    // The playground requires moderators to use two-factor.
    const cookie = await signIn('notesmod');
    const { totpURI } = await (await auth('/two-factor/enable', { password: 'password123' }, cookie)).json();
    moderatorCookie = cookiesOf(await auth('/two-factor/verify-totp', { code: totp(totpURI) }, cookie));
});

describe('staff notes on users', () => {
    it('are for staff only', async () => {
        expect((await notes(userId, userCookie)).status).toBe(403);
        expect((await notes(userId, userCookie, { method: 'POST', body: { body: 'Hi' } })).status).toBe(403);
        expect((await notes(userId, '')).status).toBe(401);
    });

    it('are added, listed newest first and audit-logged', async () => {
        const first = await notes(userId, moderatorCookie, { method: 'POST', body: { body: '  Warned for spam  ' } });
        expect(first.status).toBe(200);
        expect(await first.json()).toMatchObject({ body: 'Warned for spam', authorEmail: 'notesmod@notes.test' });
        expect((await notes(userId, adminCookie, { method: 'POST', body: { body: 'Second warning' } })).status).toBe(
            200
        );

        const list = await (await notes(userId, moderatorCookie)).json();
        expect(list.map((note: { body: string }) => note.body)).toEqual(['Second warning', 'Warned for spam']);

        const logged = new Database(databasePath)
            .prepare("select count(*) as count from adminAuditLog where action = 'user.note-add' and targetId = ?")
            .get(userId) as { count: number };
        expect(logged.count).toBe(2);
    });

    it('refuses empty and overlong notes', async () => {
        expect((await notes(userId, adminCookie, { method: 'POST', body: { body: '   ' } })).status).toBe(400);
        expect((await notes(userId, adminCookie, { method: 'POST', body: { body: 'x'.repeat(2001) } })).status).toBe(
            400
        );
    });

    it('are deleted by their author, or by those who can delete users, not by other staff', async () => {
        const list: Array<{ id: string; body: string }> = await (await notes(userId, adminCookie)).json();
        const byAdmin = list.find((note) => note.body === 'Second warning')!;
        const byModerator = list.find((note) => note.body === 'Warned for spam')!;

        // Moderators can't delete users, so only their own notes.
        expect((await notes(userId, moderatorCookie, { method: 'DELETE', noteId: byAdmin.id })).status).toBe(403);
        expect((await notes(userId, moderatorCookie, { method: 'DELETE', noteId: byModerator.id })).status).toBe(200);
        expect((await notes(userId, moderatorCookie, { method: 'DELETE', noteId: byModerator.id })).status).toBe(404);
        // Admins can delete anyone's (here their own).
        expect((await notes(userId, adminCookie, { method: 'DELETE', noteId: byAdmin.id })).status).toBe(200);
        expect(await (await notes(userId, adminCookie)).json()).toEqual([]);
    });

    it("stay out of the user's data download, audit entries included", async () => {
        expect((await notes(userId, adminCookie, { method: 'POST', body: { body: 'Private remark' } })).status).toBe(
            200
        );
        const text = await (
            await fetch(`${base}/api/_better-auth-ui/export`, { headers: { cookie: userCookie } })
        ).text();
        expect(text).toContain('user.note-add');
        expect(text).not.toMatch(/Private remark|Warned for spam|Second warning/);
    });

    it('go when the user is deleted', async () => {
        expect((await notes(userId, adminCookie, { method: 'POST', body: { body: 'Gone soon' } })).status).toBe(200);
        expect((await auth('/admin/remove-user', { userId }, adminCookie)).status).toBe(200);
        const left = new Database(databasePath)
            .prepare('select count(*) as count from adminUserNote where userId = ?')
            .get(userId) as { count: number };
        expect(left.count).toBe(0);
    });
});
