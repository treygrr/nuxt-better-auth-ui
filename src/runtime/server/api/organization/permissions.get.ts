import { defineEventHandler, getRequestHeaders, requireUserSession, serverAuth } from '#imports';
import * as z from 'zod';

import { readParams, routeId } from '../../utils/input';

const Params = z.object({ id: routeId() });

type OrganizationAuth = {
    api: {
        hasPermission(input: {
            headers: Headers;
            body: { organizationId: string; permissions: Record<string, string[]> };
        }): Promise<{ success: boolean }>;
    };
    options: { plugins?: Array<{ id: string; options?: { ac?: { statements?: Record<string, readonly string[]> } } }> };
};

const DEFAULT_STATEMENTS: Record<string, readonly string[]> = {
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete']
};

/**
 * What the signed-in user may do in an organization, as `{ 'member:update': true, … }` for every resource and action:
 * Better Auth's own `hasPermission`, so the app's roles and the organization's dynamic roles count. The organization's
 * page shows its controls from it; Better Auth checks every change again.
 */
export default defineEventHandler(async (event): Promise<Record<string, boolean>> => {
    await requireUserSession(event);
    const { id: organizationId } = readParams(event, Params);
    const auth = serverAuth(event) as unknown as OrganizationAuth;
    const plugin = auth.options.plugins?.find((item) => item.id === 'organization');
    const statements = plugin?.options?.ac?.statements ?? DEFAULT_STATEMENTS;
    const headers = new Headers(getRequestHeaders(event) as Record<string, string>);
    const checks = Object.entries(statements).flatMap(([resource, actions]) =>
        actions.map(async (action) => {
            const result = await auth.api
                .hasPermission({ headers, body: { organizationId, permissions: { [resource]: [action] } } })
                .catch(() => ({ success: false }));
            return [`${resource}:${action}`, result.success] as const;
        })
    );
    return Object.fromEntries(await Promise.all(checks));
});
