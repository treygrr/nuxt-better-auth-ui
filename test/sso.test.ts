import { execSync } from 'node:child_process';

import { beforeAll, describe, expect, it } from 'vitest';

import { base, cookiesOf, Database, databasePath } from './helpers';

// Single sign-on (betterAuthUi.sso, on in the playground with domain verification), against the built server and its
// mock OIDC identity provider (/api/_playground/oidc).
const auth = (path: string, body: unknown, cookie = '') =>
    fetch(`${base}/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie },
        body: JSON.stringify(body)
    });
const get = (path: string, cookie = '') => fetch(`${base}${path}`, { redirect: 'manual', headers: { cookie } });
const signUp = async (name: string) => {
    const email = `${name}@sso-users.test`;
    await auth('/sign-up/email', { name, email, password: 'password123' });
    const cookie = cookiesOf(await auth('/sign-in/email', { email, password: 'password123' }));
    return { cookie, email };
};
const issuer = `${base}/api/_playground/oidc`;
const db = () => new Database(databasePath);

/** Signs in through the identity provider: Better Auth's redirect, the provider's, then Better Auth's callback. */
async function ssoSignIn(body: Record<string, unknown>) {
    const started = await auth('/sign-in/sso', { callbackURL: '/', ...body });
    expect(started.status).toBe(200);
    const { url } = (await started.json()) as { url: string };
    const approved = await fetch(url, { redirect: 'manual' });
    const callback = approved.headers.get('location')!;
    expect(callback).toContain(`${base}/api/auth/sso/callback/`);
    const done = await fetch(callback, { redirect: 'manual', headers: { cookie: cookiesOf(started) } });
    return { done, cookie: cookiesOf(done) };
}

let owner: Awaited<ReturnType<typeof signUp>>;
let member: Awaited<ReturnType<typeof signUp>>;
let staffCookie: string;
let organizationId: string;

beforeAll(async () => {
    owner = await signUp('sonia');
    member = await signUp('marco');
    await signUp('ssostaff');
    db().prepare("update user set role = 'admin' where email = 'ssostaff@sso-users.test'").run();
    staffCookie = cookiesOf(
        await auth('/sign-in/email', { email: 'ssostaff@sso-users.test', password: 'password123' })
    );
    const created = await auth('/organization/create', { name: 'Globex', slug: 'globex' }, owner.cookie);
    organizationId = (await created.json()).id;
    // Added by staff (Better Auth's add-member is server-only).
    await fetch(`${base}/api/_better-auth-ui/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: base, cookie: staffCookie },
        body: JSON.stringify({ email: member.email, roles: ['member'] })
    });
});

describe('single sign-on', () => {
    it('shows in the capabilities, with domain verification and the addresses to give providers', async () => {
        const capabilities = await (await fetch(`${base}/api/_better-auth-ui/capabilities`)).json();
        expect(capabilities.sso).toMatchObject({
            domainVerification: { enabled: true, tokenPrefix: 'better-auth-token' },
            baseURL: `${base}/api/auth`,
            redirectURI: null
        });
    });

    it("is registered by an organization's owners and admins, not its members", async () => {
        const provider = {
            providerId: 'globex-oidc',
            issuer,
            domain: 'globex.test',
            organizationId,
            oidcConfig: { clientId: 'globex-client', clientSecret: 'globex-secret' }
        };
        expect((await auth('/sso/register', { ...provider, providerId: 'nope' }, member.cookie)).status).toBe(403);
        const registered = await auth('/sso/register', provider, owner.cookie);
        expect(registered.status).toBe(200);
        const data = await registered.json();
        // Discovered from the issuer; a token to put in DNS.
        expect(data.oidcConfig.tokenEndpoint).toBe(`${issuer}/token`);
        expect(data.domainVerified).toBe(false);
        expect(data.domainVerificationToken).toMatch(/^[\w-]{24}$/);

        const { providers } = await (await get('/api/auth/sso/providers', owner.cookie)).json();
        expect(providers).toEqual([
            expect.objectContaining({ providerId: 'globex-oidc', organizationId, type: 'oidc', domainVerified: false })
        ]);
        expect(JSON.stringify(providers)).not.toContain('globex-secret');
        expect((await (await get('/api/auth/sso/providers', member.cookie)).json()).providers).toEqual([]);
    });

    it("can't sign anyone in until the domain is verified", async () => {
        const started = await auth('/sign-in/sso', { email: 'worker@globex.test', callbackURL: '/' });
        expect(started.status).toBe(401);
        // The DNS record isn't there (globex.test doesn't exist), so verifying fails; the token stays the same.
        const token = await auth('/sso/request-domain-verification', { providerId: 'globex-oidc' }, owner.cookie);
        expect(token.ok).toBe(true);
        expect((await token.json()).domainVerificationToken).toMatch(/^[\w-]{24}$/);
        const verify = await auth('/sso/verify-domain', { providerId: 'globex-oidc' }, owner.cookie);
        expect(verify.status).toBe(502);
        expect((await verify.json()).code).toBe('DOMAIN_VERIFICATION_FAILED');
    });

    it('signs in by work email or organization slug, adding the user to the organization with getRole', async () => {
        // As if the TXT record had been found.
        db().prepare("update ssoProvider set domainVerified = 1 where providerId = 'globex-oidc'").run();

        const lead = await ssoSignIn({ email: 'lead.ann@globex.test' });
        expect(lead.done.status).toBe(302);
        const session = await (await get('/api/auth/get-session', lead.cookie)).json();
        expect(session.user.email).toBe('lead.ann@globex.test');

        const worker = await ssoSignIn({ organizationSlug: 'globex', loginHint: 'worker@globex.test' });
        expect((await (await get('/api/auth/get-session', worker.cookie)).json()).user.email).toBe(
            'worker@globex.test'
        );

        const roles = db()
            .prepare(
                'select user.email, member.role from member join user on user.id = member.userId where organizationId = ? order by user.email'
            )
            .all(organizationId);
        expect(roles).toEqual(
            expect.arrayContaining([
                { email: 'lead.ann@globex.test', role: 'admin' },
                { email: 'worker@globex.test', role: 'member' }
            ])
        );
    });

    it('says when no provider matches', async () => {
        const started = await auth('/sign-in/sso', { email: 'someone@initech.test', callbackURL: '/' });
        expect(started.status).toBe(404);
    });

    it('is listed for staff without secrets, and not for others', async () => {
        expect((await get('/api/_better-auth-ui/sso-providers', owner.cookie)).status).toBe(403);
        const response = await get('/api/_better-auth-ui/sso-providers', staffCookie);
        expect(response.status).toBe(200);
        const providers = await response.json();
        expect(providers).toEqual([
            {
                providerId: 'globex-oidc',
                type: 'oidc',
                issuer,
                domain: 'globex.test',
                domainVerified: true,
                organization: { id: organizationId, name: 'Globex' },
                owner: expect.objectContaining({ email: owner.email })
            }
        ]);
        expect(JSON.stringify(providers)).not.toContain('globex-secret');
    });

    it('shows on the pages: sign-in, the organization’s SSO tab (for owners), the admin', async () => {
        expect(await (await get('/login')).text()).toContain('Sign in with SSO');
        const page = await (await get(`/organization/${organizationId}?tab=sso`, owner.cookie)).text();
        expect(page).toContain('globex-oidc');
        expect(page).toContain(`${base}/api/auth/sso/callback/globex-oidc`);
        const memberPage = await (await get(`/organization/${organizationId}?tab=sso`, member.cookie)).text();
        expect(memberPage).not.toContain('globex-oidc');
        expect(await (await get('/admin/sso', staffCookie)).text()).toContain('globex-oidc');
    });

    it('registers SAML providers too, with the service provider metadata to give them', async () => {
        // A throwaway signing certificate for the identity provider.
        const cert = execSync('openssl req -x509 -newkey rsa:2048 -nodes -subj /CN=idp -days 1 -keyout /dev/null', {
            stdio: ['ignore', 'pipe', 'ignore']
        }).toString();
        const registered = await auth(
            '/sso/register',
            {
                providerId: 'globex-saml',
                issuer: `${base}/saml/globex`,
                domain: 'saml.globex.test',
                organizationId,
                samlConfig: {
                    entryPoint: 'https://idp.globex.test/sso',
                    cert,
                    idpMetadata: { entityID: 'https://idp.globex.test' },
                    wantAssertionsSigned: true
                }
            },
            owner.cookie
        );
        expect(registered.status).toBe(200);
        const metadata = await get('/api/auth/sso/saml2/sp/metadata?providerId=globex-saml');
        expect(metadata.status).toBe(200);
        expect(await metadata.text()).toContain(`${base}/api/auth/sso/saml2/sp/acs/globex-saml`);
        expect((await auth('/sso/delete-provider', { providerId: 'globex-saml' }, owner.cookie)).status).toBe(200);
    });

    it('is updated and deleted by the owner, not by members', async () => {
        const updated = await auth(
            '/sso/update-provider',
            { providerId: 'globex-oidc', oidcConfig: { scopes: ['openid', 'email'] } },
            owner.cookie
        );
        expect(updated.status).toBe(200);
        expect((await auth('/sso/delete-provider', { providerId: 'globex-oidc' }, member.cookie)).status).toBe(403);
        expect((await auth('/sso/delete-provider', { providerId: 'globex-oidc' }, owner.cookie)).status).toBe(200);
        expect((await (await get('/api/auth/sso/providers', owner.cookie)).json()).providers).toEqual([]);
    });

    it('signs people in with SAML, through a real signed response, into the organization', async () => {
        // The playground's SAML identity provider, signing with a key made for this test run.
        const idp = `${base}/api/_playground/saml/globex-saml-idp`;
        const metadata = await (await fetch(`${idp}/metadata`)).text();
        expect(metadata).toContain('X509Certificate');
        const registered = await auth(
            '/sso/register',
            {
                providerId: 'globex-saml-idp',
                issuer: `${base}/saml/globex`,
                domain: 'saml.globex.test',
                organizationId,
                samlConfig: { entryPoint: `${idp}/sso`, idpMetadata: { metadata }, wantAssertionsSigned: true }
            },
            owner.cookie
        );
        expect(registered.status).toBe(200);
        db().prepare("update ssoProvider set domainVerified = 1 where providerId = 'globex-saml-idp'").run();

        // Better Auth sends the browser to the identity provider with a SAML request...
        const started = await auth('/sign-in/sso', { email: 'lead.sam@saml.globex.test', callbackURL: '/account' });
        expect(started.status).toBe(200);
        const { url } = (await started.json()) as { url: string };
        expect(url).toContain(`${idp}/sso?SAMLRequest=`);
        // ...which answers with a page that posts a signed response to Better Auth's ACS URL.
        const page = await (await fetch(`${url}&email=lead.sam@saml.globex.test`)).text();
        const action = page.match(/action="([^"]+)"/)![1]!;
        expect(action).toBe(`${base}/api/auth/sso/saml2/sp/acs/globex-saml-idp`);
        const field = (name: string) => page.match(new RegExp(`name="${name}" value="([^"]*)"`))?.[1] ?? '';
        const acs = await fetch(action, {
            method: 'POST',
            redirect: 'manual',
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookiesOf(started) },
            body: new URLSearchParams({
                SAMLResponse: field('SAMLResponse'),
                RelayState: field('RelayState').replaceAll('&quot;', '"')
            })
        });
        expect(acs.status).toBe(302);
        expect(acs.headers.get('location')).toContain('/account');

        const session = await (await get('/api/auth/get-session', cookiesOf(acs))).json();
        expect(session.user.email).toBe('lead.sam@saml.globex.test');
        // Joined the provider's organization, with getRole's role.
        const member = db()
            .prepare('select member.role from member join user on user.id = member.userId where user.email = ?')
            .get('lead.sam@saml.globex.test') as { role: string };
        expect(member.role).toBe('admin');
    });

    it("refuses a SAML response that isn't the identity provider's", async () => {
        const started = await auth('/sign-in/sso', { providerId: 'globex-saml-idp', callbackURL: '/account' });
        const { url } = (await started.json()) as { url: string };
        const page = await (await fetch(`${url}&email=mallory@saml.globex.test`)).text();
        const field = (name: string) => page.match(new RegExp(`name="${name}" value="([^"]*)"`))?.[1] ?? '';
        // Change who it's for, after the identity provider signed it.
        const signed = Buffer.from(field('SAMLResponse'), 'base64').toString('utf8');
        expect(signed).toContain('<ds:Signature');
        expect(signed).toContain('mallory@saml.globex.test');
        const forged = Buffer.from(
            signed.replaceAll('mallory@saml.globex.test', 'lead.sam@saml.globex.test'),
            'utf8'
        ).toString('base64');
        const acs = await fetch(`${base}/api/auth/sso/saml2/sp/acs/globex-saml-idp`, {
            method: 'POST',
            redirect: 'manual',
            headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookiesOf(started) },
            body: new URLSearchParams({
                SAMLResponse: forged,
                RelayState: field('RelayState').replaceAll('&quot;', '"')
            })
        });
        expect(cookiesOf(acs)).not.toContain('session_token');
        expect([302, 400, 401]).toContain(acs.status);
        if (acs.status === 302) expect(acs.headers.get('location')).toContain('error=');
    });
});
