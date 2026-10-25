import { createError, defineEventHandler, readBody, requireUserSession, serverAuth, useRuntimeConfig } from '#imports';

import type { AuditPerson } from '../audit/plugin';
import { recordAdminAction, type AdminContext } from '../utils/admin';

type ApiKeyAuth = {
    api: {
        createApiKey(input: {
            body: { userId: string; name: string; expiresIn?: number; permissions?: Record<string, string[]> };
        }): Promise<{ id: string; key: string; name: string | null; start: string | null; expiresAt: Date | null }>;
    };
    $context: Promise<AdminContext>;
};

/** Expiry choices, in days, as Better Auth allows from 1 to 365; null never expires. */
const EXPIRES_IN_DAYS = [30, 90, 365];

/**
 * Creates an API key for the signed-in user. Better Auth only takes a key's permissions from server calls, so this
 * calls its server API (`createApiKey`, with the user's id) after checking the permissions are among the module's
 * `apiKey.scopes`. Returns the key, which is shown once.
 */
export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event);
    if ((user as { isAnonymous?: boolean | null }).isAnonymous) {
        throw createError({ statusCode: 403, statusMessage: 'Guest accounts can’t have API keys' });
    }
    const body = (await readBody<{ name?: unknown; expiresInDays?: unknown; scopes?: unknown }>(event)) ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 64)
        throw createError({ statusCode: 400, statusMessage: 'Name the key (64 characters at most)' });
    const days = body.expiresInDays ?? null;
    if (days !== null && !EXPIRES_IN_DAYS.includes(days as number)) {
        throw createError({ statusCode: 400, statusMessage: 'Choose when the key expires' });
    }

    // "resource:action" strings, each one the module allows.
    const allowed = (useRuntimeConfig().public.betterAuthUi as { apiKeyScopes: Record<string, string[]> }).apiKeyScopes;
    const scopes = Array.isArray(body.scopes) ? body.scopes : [];
    const permissions: Record<string, string[]> = {};
    for (const scope of scopes) {
        const [resource, action] = typeof scope === 'string' ? scope.split(':') : [];
        if (!resource || !action || !allowed[resource]?.includes(action)) {
            throw createError({ statusCode: 400, statusMessage: `Unknown permission: ${String(scope)}` });
        }
        (permissions[resource] ??= []).push(action);
    }

    const auth = serverAuth(event) as unknown as ApiKeyAuth;
    const created = await auth.api.createApiKey({
        body: {
            userId: user.id,
            name,
            ...(days !== null && { expiresIn: (days as number) * 86_400 }),
            ...(Object.keys(permissions).length && { permissions })
        }
    });
    await recordAdminAction(event, await auth.$context, {
        action: 'auth.api-key-created',
        actor: user as AuditPerson,
        target: user as AuditPerson,
        details: { name, permissions: Object.keys(permissions).length ? permissions : null }
    });
    return {
        id: created.id,
        key: created.key,
        name: created.name,
        start: created.start,
        expiresAt: created.expiresAt
    };
});
