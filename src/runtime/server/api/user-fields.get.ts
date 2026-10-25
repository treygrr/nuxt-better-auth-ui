import { defineEventHandler } from '#imports';

import { requireAdminPermission } from '../utils/admin';

/** One of the app's own user fields (Better Auth's `user.additionalFields`), as the admin pages show it. */
export type AdminUserField = {
    name: string;
    /** 'string', 'number', 'boolean', 'date', 'string[]', 'number[]', or the allowed values of an enum. */
    type: string | string[];
    required: boolean;
    /** False for server-owned fields (`input: false`): shown, not edited. */
    editable: boolean;
};

type FieldAttributes = { type: string | string[]; required?: boolean; input?: boolean; returned?: boolean };
type FieldsAuth = { options: { user?: { additionalFields?: Record<string, FieldAttributes> } } };

/**
 * The app's own user fields, from its Better Auth config (`user.additionalFields`), for the user page's "More details"
 * card. Not plugins' fields (those have their own cards), nor fields Better Auth doesn't return (`returned: false`),
 * whose values the admin never sees.
 */
export default defineEventHandler(async (event): Promise<AdminUserField[]> => {
    const { auth } = await requireAdminPermission(event, { user: ['get'] });
    const fields = (auth as unknown as FieldsAuth).options.user?.additionalFields ?? {};
    return Object.entries(fields)
        .filter(([, field]) => field.returned !== false)
        .map(([name, field]) => ({
            name,
            type: field.type,
            required: field.required === true,
            editable: field.input !== false
        }));
});
