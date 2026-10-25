import { createError, defineEventHandler, getRouterParam, readBody } from '#imports';

import type { AuditPerson } from '../../audit/plugin';
import { NOTES_MODEL, type UserNote } from '../../notes/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';

const MAX_NOTE_LENGTH = 2000;

/** Adds a staff note to a user, for anyone who can update the user. */
export default defineEventHandler(async (event): Promise<UserNote> => {
    const { user: author, context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    const body = (await readBody<{ body?: unknown }>(event))?.body;
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text)
        throw createError({ statusCode: 400, statusMessage: 'Write a note first', data: { code: 'NOTE_EMPTY' } });
    if (text.length > MAX_NOTE_LENGTH) {
        throw createError({
            statusCode: 400,
            statusMessage: `Notes are at most ${MAX_NOTE_LENGTH} characters`,
            data: { code: 'NOTE_TOO_LONG' }
        });
    }

    const note = await context.adapter.create<UserNote>({
        model: NOTES_MODEL,
        data: {
            userId: user.id,
            authorId: author.id,
            authorName: author.name,
            authorEmail: author.email,
            body: text,
            createdAt: new Date()
        }
    });
    await recordAdminAction(event, context, {
        action: 'user.note-add',
        actor: author as AuditPerson,
        target: user as AuditPerson,
        details: { noteId: note.id }
    });
    return note;
});
