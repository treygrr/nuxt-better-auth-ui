// The root typecheck runs in the app context, whose #imports has no server-only utilities. Server routes still
// end up in it, because Nitro's generated route types import every handler, so declare what they use.
type Session = typeof import('../node_modules/@nuxtjs/better-auth/dist/runtime/server/utils/session');
type Auth = typeof import('../node_modules/@nuxtjs/better-auth/dist/runtime/server/utils/auth');
type H3 = typeof import('h3');

declare module '#imports' {
    export const requireUserSession: Session['requireUserSession'];
    export const serverAuth: Auth['serverAuth'];
    export const createError: H3['createError'];
    export const defineEventHandler: H3['defineEventHandler'];
    export const getRouterParam: H3['getRouterParam'];
    export const getQuery: H3['getQuery'];
    export const getRequestIP: H3['getRequestIP'];
    export const getRequestHeader: H3['getRequestHeader'];
    export const setResponseHeader: H3['setResponseHeader'];
    export const useRuntimeConfig: () => { public: Record<string, unknown> };
}

export {};
