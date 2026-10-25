import { createError, defineEventHandler, getRouterParam } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { NOTES_MODEL, type UserNote } from '../../notes/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';

/** Deletes a staff note: its author's own, or anyone's for those who can delete users. */
export default defineEventHandler(async (event) => {
    const { user: admin, context, auth } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));

    const [note] = await context.adapter.findMany<UserNote>({
        model: NOTES_MODEL,
        where: [
            { field: 'id', value: getRouterParam(event, 'noteId') },
            { field: 'userId', value: user.id, connector: 'AND' }
        ],
        limit: 1
    });
    if (!note) throw createError({ statusCode: 404, statusMessage: 'Note not found' });
    if (note.authorId !== admin.id) {
        const { success } = await auth.api.userHasPermission({
            body: { userId: admin.id, permissions: { user: ['delete'] } }
        });
        if (!success) throw createError({ statusCode: 403, statusMessage: 'Only its author can delete this note' });
    }
    await context.adapter.delete({ model: NOTES_MODEL, where: [{ field: 'id', value: note.id }] });

    await recordAdminAction(event, context, {
        action: 'user.note-delete',
        actor: admin as AuditPerson,
        target: user as AuditPerson,
        // Not the note's text: the user's data download includes entries about them.
        details: { noteId: note.id }
    });
    return { removed: note.id };
});
