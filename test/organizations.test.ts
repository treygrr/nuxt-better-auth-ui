import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath, linkIn, waitForEmail } from './helpers';

// Organizations (betterAuthUi.organization, on in the playground), against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const get = (path: string, cookie: string) => fetch(`${base}${path}`, { redirect: 'manual', headers: { cookie } });
const signUp = async (name: string) => {
    const email = `${name}@orgs.test`;
    await auth('/sign-up/email', { name, email, password: 'password123' });
    const cookie = cookiesOf(await auth('/sign-in/email', { email, password: 'password123' }));
    const { id } = new Database(databasePath).prepare('select id from user where email = ?').get(email) as {
        id: string;
    };
    return { cookie, id, email };
};

let owner: Awaited<ReturnType<typeof signUp>>;
let invitee: Awaited<ReturnType<typeof signUp>>;
let adminCookie: string;
let organizationId: string;

beforeAll(async () => {
    owner = await signUp('olga');
    invitee = await signUp('ivan');
    await signUp('orgadmin');
    new Database(databasePath).prepare("update user set role = 'admin' where email = 'orgadmin@orgs.test'").run();
    adminCookie = cookiesOf(await auth('/sign-in/email', { email: 'orgadmin@orgs.test', password: 'password123' }));
});

describe('organizations', () => {
    it('show in the capabilities', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.organization).toMatchObject({ allowCreate: true });
    });

    it('are created by users, who own them', async () => {
        const created = await auth('/organization/create', { name: 'Acme Inc', slug: 'acme-inc' }, owner.cookie);
        expect(created.status).toBe(200);
        organizationId = (await created.json()).id;
        const list = await (await get('/api/auth/organization/list', owner.cookie)).json();
        expect(list.map((organization: { slug: string }) => organization.slug)).toContain('acme-inc');
    });

    it('invite by email, with a link to the invitation page, which the invitee accepts', async () => {
        const invite = await auth(
            '/organization/invite-member',
            { email: invitee.email, role: 'admin', organizationId },
            owner.cookie
        );
        expect(invite.status).toBe(200);
        const email = await waitForEmail(invitee.email, 'organization-invitation');
        expect(email.subject).toBe('olga invited you to join Acme Inc');
        const link = linkIn(email);
        expect(link).toMatch(new RegExp(`^${base}/accept-invitation/`));

        const path = new URL(link).pathname;
        // Signed out, it asks them to sign in first; signed in, it shows the invitation.
        expect((await get(path, '')).status).toBe(302);
        const page = await get(path, invitee.cookie);
        expect(page.status).toBe(200);
        expect(await page.text()).toContain('Join Acme Inc');

        const invitationId = path.split('/').pop()!;
        expect((await auth('/organization/accept-invitation', { invitationId }, invitee.cookie)).status).toBe(200);
        const members = await (
            await get(`/api/auth/organization/list-members?organizationId=${organizationId}`, owner.cookie)
        ).json();
        expect(members.members.map((member: { role: string }) => member.role).sort()).toEqual(['admin', 'owner']);
    });

    it('are listed for staff, read-only, with members and a user’s memberships', async () => {
        expect((await get('/api/_better-auth-ui/organizations', owner.cookie)).status).toBe(403);
        const { organizations } = await (
            await get('/api/_better-auth-ui/organizations?search=Acme', adminCookie)
        ).json();
        expect(organizations).toEqual([expect.objectContaining({ id: organizationId, name: 'Acme Inc', members: 2 })]);

        const detail = await (await get(`/api/_better-auth-ui/organizations/${organizationId}`, adminCookie)).json();
        expect(detail.members.map((member: { user: { email: string } }) => member.user.email).sort()).toEqual([
            invitee.email,
            owner.email
        ]);
        const mine = await (await get(`/api/_better-auth-ui/users/${invitee.id}/organizations`, adminCookie)).json();
        expect(mine).toEqual([expect.objectContaining({ name: 'Acme Inc', role: 'admin' })]);

        expect((await get('/admin/organizations', adminCookie)).status).toBe(200);
        expect((await get(`/admin/organizations/${organizationId}`, adminCookie)).status).toBe(200);
    });

    it("are joined by whoever staff add, through Better Auth's addMember, audit-logged", async () => {
        const newcomer = await signUp('nina');
        const add = (cookie: string, body: unknown) =>
            fetch(`${base}/api/_better-auth-ui/organizations/${organizationId}/members`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', origin: base, cookie },
                body: JSON.stringify(body)
            });
        expect((await add(owner.cookie, { email: newcomer.email, roles: ['member'] })).status).toBe(403);
        expect((await add(adminCookie, { email: 'nobody@orgs.test', roles: ['member'] })).status).toBe(404);
        expect((await add(adminCookie, { email: newcomer.email, roles: ['member', 'editor'] })).status).toBe(200);

        const detail = await (await get(`/api/_better-auth-ui/organizations/${organizationId}`, adminCookie)).json();
        const added = detail.members.find(
            (member: { user: { email: string } }) => member.user.email === newcomer.email
        );
        expect(added.role).toBe('member,editor');
        const logged = new Database(databasePath)
            .prepare(
                "select count(*) as count from adminAuditLog where action = 'organization.member-add' and targetId = ?"
            )
            .get(newcomer.id) as { count: number };
        expect(logged.count).toBe(1);
    });
});
