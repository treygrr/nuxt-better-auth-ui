import { defineEventHandler, getRouterParam } from '#imports';
import * as z from 'zod';

import type { AuditPerson } from '../../audit/plugin';
import { NOTES_MODEL, type UserNote } from '../../notes/plugin';
import { recordAdminAction, requireAdminPermission, requireUser } from '../../utils/admin';
import { readJsonBody } from '../../utils/input';

const MAX_NOTE_LENGTH = 2000;

const Body = z.object({ body: z.string().trim().min(1).max(MAX_NOTE_LENGTH, { error: 'tooLong' }) });

/** Adds a staff note to a user, for anyone who can update the user. */
export default defineEventHandler(async (event): Promise<UserNote> => {
    const { user: author, context } = await requireAdminPermission(event, { user: ['update'] });
    const user = await requireUser(context, getRouterParam(event, 'id'));
    // Each error's code is translated on the page (errors.<code>); the message is the English fallback.
    const { body: text } = await readJsonBody(event, Body, {
        body: { code: 'NOTE_EMPTY', message: 'Write a note first' },
        tooLong: { code: 'NOTE_TOO_LONG', message: `Notes are at most ${MAX_NOTE_LENGTH} characters` }
    });

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
