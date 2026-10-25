import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// The Organization plugin as the playground configures it: a "project" resource, an "editor" role, admins with
// project permissions, dynamic roles, teams and a "website" field. Against the built server.
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const get = (path: string, cookie: string) => fetch(`${base}/api/auth${path}`, { headers: { cookie } });
const signUp = async (name: string) => {
    const email = `${name}@orgconfig.test`;
    await auth('/sign-up/email', { name, email, password: 'password123' });
    const cookie = cookiesOf(await auth('/sign-in/email', { email, password: 'password123' }));
    const { id } = new Database(databasePath).prepare('select id from user where email = ?').get(email) as {
        id: string;
    };
    return { cookie, id, email };
};

let owner: Awaited<ReturnType<typeof signUp>>;
let member: Awaited<ReturnType<typeof signUp>>;
let organizationId: string;
let memberId: string;

beforeAll(async () => {
    owner = await signUp('oscar');
    member = await signUp('mia');
    const created = await auth(
        '/organization/create',
        { name: 'Config Co', slug: 'config-co', website: 'https://config.example' },
        owner.cookie
    );
    const organization = await created.json();
    organizationId = organization.id;
    expect(organization.website).toBe('https://config.example');
    const added = await auth('/organization/add-member', { userId: member.id, organizationId, role: 'member' });
    // add-member is server-only: over HTTP it's refused, so the member joins by invitation instead.
    expect(added.status).not.toBe(200);
    const invitation = await (
        await auth('/organization/invite-member', { email: member.email, role: 'member', organizationId }, owner.cookie)
    ).json();
    expect((await auth('/organization/accept-invitation', { invitationId: invitation.id }, member.cookie)).status).toBe(
        200
    );
    const { members } = await (
        await get(`/organization/list-members?organizationId=${organizationId}`, owner.cookie)
    ).json();
    memberId = members.find((item: { userId: string }) => item.userId === member.id).id;
});

describe('organization configuration', () => {
    it('shows in the capabilities: roles, resources, dynamic roles, teams and fields', async () => {
        const { organization } = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(organization).toMatchObject({
            allowCreate: true,
            roles: ['owner', 'admin', 'member', 'editor'],
            dynamicRoles: true,
            teams: true,
            deletion: true,
            fields: { organization: [{ name: 'website', type: 'string', required: false, editable: true }] }
        });
        expect(organization.statements.project).toEqual(['create', 'update', 'delete']);
        expect(organization.statements.organization).toEqual(['update', 'delete']);
    });

    it("gives custom roles their permissions, and Better Auth's roles theirs plus the app's", async () => {
        const check = async (cookie: string, permissions: Record<string, string[]>) =>
            (await (await auth('/organization/has-permission', { organizationId, permissions }, cookie)).json())
                .success;
        expect(await check(owner.cookie, { organization: ['delete'] })).toBe(true);

        expect(
            (await auth('/organization/update-member-role', { memberId, role: 'editor', organizationId }, owner.cookie))
                .status
        ).toBe(200);
        expect(await check(member.cookie, { project: ['create'] })).toBe(true);
        expect(await check(member.cookie, { project: ['delete'] })).toBe(false);

        expect(
            (await auth('/organization/update-member-role', { memberId, role: 'admin', organizationId }, owner.cookie))
                .status
        ).toBe(200);
        expect(await check(member.cookie, { project: ['delete'], member: ['update'] })).toBe(true);
    });

    it('lets owners create their own roles', async () => {
        const created = await auth(
            '/organization/create-role',
            { role: 'reviewer', permission: { project: ['update'] }, organizationId },
            owner.cookie
        );
        expect(created.status).toBe(200);
        const roles = await (
            await get(`/organization/list-roles?organizationId=${organizationId}`, owner.cookie)
        ).json();
        expect(roles.map((role: { role: string }) => role.role)).toContain('reviewer');
        expect(
            (
                await auth(
                    '/organization/update-member-role',
                    { memberId, role: 'reviewer', organizationId },
                    owner.cookie
                )
            ).status
        ).toBe(200);
    });

    it('has teams, with members', async () => {
        const team = await (
            await auth('/organization/create-team', { name: 'Design', organizationId }, owner.cookie)
        ).json();
        expect(team.name).toBe('Design');
        expect(
            (await auth('/organization/add-team-member', { teamId: team.id, userId: member.id }, owner.cookie)).status
        ).toBe(200);
        // Better Auth lists a team's members to its own members.
        const teamMembers = await (
            await fetch(`${base}/api/auth/organization/list-team-members?teamId=${team.id}`, {
                headers: { cookie: member.cookie }
            })
        ).json();
        expect(teamMembers.map((item: { userId: string }) => item.userId)).toContain(member.id);

        // The organization's page shows every team with its members, to anyone in the organization.
        const ui = (cookie: string) =>
            fetch(`${base}/api/_better-auth-ui/organizations/${organizationId}/teams`, { headers: { cookie } });
        // Better Auth also gives a new organization a default team named after it.
        const teams = await (await ui(owner.cookie)).json();
        expect(teams).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Design', members: [expect.objectContaining({ email: member.email })] })
            ])
        );
        const outsider = await signUp('olive');
        expect((await ui(outsider.cookie)).status).toBe(403);
    });

    it("tells the organization's page what each member may do", async () => {
        const permissions = async (cookie: string) =>
            (
                await fetch(`${base}/api/_better-auth-ui/organizations/${organizationId}/permissions`, {
                    headers: { cookie }
                })
            ).json();
        const owners = await permissions(owner.cookie);
        expect(owners).toMatchObject({ 'organization:delete': true, 'project:delete': true, 'ac:create': true });
        // The member has the organization's own "reviewer" role by now: project updates only.
        const members = await permissions(member.cookie);
        expect(members).toMatchObject({
            'organization:delete': false,
            'project:update': true,
            'project:delete': false
        });
    });
});
