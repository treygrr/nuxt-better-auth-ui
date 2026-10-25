/** An SSO provider as Better Auth's SSO plugin lists it (`/sso/providers`): never its secrets. */
export type SsoProvider = {
    providerId: string;
    type: 'oidc' | 'saml';
    issuer: string;
    domain: string;
    organizationId: string | null;
    domainVerified: boolean;
    oidcConfig?: {
        discoveryEndpoint?: string;
        clientIdLastFour?: string;
        pkce?: boolean;
        scopes?: string[];
        tokenEndpointAuthentication?: string;
    };
    samlConfig?: {
        entryPoint?: string;
        idpInitiatedCallbackUrl?: string;
        audience?: string;
        wantAssertionsSigned?: boolean;
        authnRequestsSigned?: boolean;
        identifierFormat?: string;
        signatureAlgorithm?: string;
        digestAlgorithm?: string;
    };
    spMetadataUrl: string;
} & Record<string, unknown>;
