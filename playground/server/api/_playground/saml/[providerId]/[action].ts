import * as samlify from 'samlify';

// A stand-in SAML 2.0 identity provider for the tests' single sign-on (PLAYGROUND_MOCK_OAUTH=1), signing its responses
// with the throwaway key the tests make (PLAYGROUND_SAML_IDP_KEY and _CERT). One per SSO provider, at
// {site}/api/_playground/saml/<providerId>:
//   /metadata  its metadata XML, to register the provider with;
//   /sso       its sign-on URL: it approves at once, for the email in ?email= (as the NameID), and posts a signed
//              response to the provider's ACS URL, as a real identity provider's page does.

// Better Auth's SSO plugin validates the XML itself; the mock trusts what it's sent.
samlify.setSchemaValidator({ validate: async () => 'skipped' });

const POST = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST';
const REDIRECT = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';

export default defineEventHandler(async (event) => {
    const key = process.env.PLAYGROUND_SAML_IDP_KEY;
    const cert = process.env.PLAYGROUND_SAML_IDP_CERT;
    if (process.env.PLAYGROUND_MOCK_OAUTH !== '1' || !key || !cert) throw createError({ statusCode: 404 });
    const providerId = getRouterParam(event, 'providerId')!;
    const issuer = `${getRequestURL(event).origin}/api/_playground/saml/${providerId}`;
    const idp = samlify.IdentityProvider({
        entityID: issuer,
        privateKey: key,
        signingCert: cert,
        nameIDFormat: ['urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'],
        singleSignOnService: [{ Binding: REDIRECT, Location: `${issuer}/sso` }],
        // Signed responses and assertions, as most identity providers send them.
        isAssertionEncrypted: false,
        messageSigningOrder: 'sign-then-encrypt'
    });

    const action = getRouterParam(event, 'action');
    if (action === 'metadata') {
        setResponseHeader(event, 'content-type', 'application/xml');
        return idp.getMetadata();
    }
    if (action !== 'sso') throw createError({ statusCode: 404 });

    // The provider's service provider metadata, from Better Auth.
    const metadata = await $fetch<string>('/api/auth/sso/saml2/sp/metadata', {
        query: { providerId, format: 'xml' },
        responseType: 'text'
    });
    const sp = samlify.ServiceProvider({ metadata, wantAssertionsSigned: true });
    const query = getQuery(event) as Record<string, string>;
    const request = await idp.parseLoginRequest(sp, 'redirect', { query });
    const email = query.email || 'worker@saml.test';
    const response = (await idp.createLoginResponse(
        sp,
        { extract: request.extract },
        'post',
        { email },
        { relayState: query.RelayState }
    )) as { context: string; entityEndpoint: string };

    // The browser posts it to the ACS URL, like a real identity provider's page.
    const field = (name: string, value?: string) =>
        value ? `<input type="hidden" name="${name}" value="${value.replaceAll('"', '&quot;')}">` : '';
    setResponseHeader(event, 'content-type', 'text/html');
    return `<!doctype html><form method="post" action="${response.entityEndpoint}">${field('SAMLResponse', response.context)}${field('RelayState', query.RelayState)}</form><script>document.forms[0].submit()</script>`;
});
