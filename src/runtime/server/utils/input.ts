import type { H3Event } from 'h3';
import { createError, getQuery, readBody } from '#imports';
import * as z from 'zod';

/** What a request that doesn't fit gets: a code, translated on the pages (errors.<code>), and the English fallback. */
export type InputError = { code: string; message: string };

const INVALID: InputError = { code: 'INVALID_INPUT', message: 'Invalid request' };

/**
 * The input as the schema reads it, or a 400 for the first issue: `errors[<the issue's message>]` (a schema names
 * one with `{ error: 'name' }`), else `errors[<its top-level field>]`, else `errors.default`. Handlers validate their
 * input here, at the boundary, so nothing past it casts.
 */
export function parseInput<Schema extends z.ZodType>(
    schema: Schema,
    input: unknown,
    errors: Partial<Record<string, InputError>> = {}
): z.output<Schema> {
    const result = schema.safeParse(input);
    if (result.success) return result.data;
    const issue = result.error.issues[0];
    const error =
        errors[issue?.message ?? ''] ?? errors[String(issue?.path[0] ?? '')] ?? errors.default ?? INVALID;
    throw createError({
        statusCode: 400,
        statusMessage: error.message,
        data: { code: error.code, fields: result.error.issues.map((issue) => issue.path.join('.')) }
    });
}

/** The request's query, read with a schema. */
export const readQuery = <Schema extends z.ZodType>(
    event: H3Event,
    schema: Schema,
    errors?: Partial<Record<string, InputError>>
) => parseInput(schema, getQuery(event), errors);

/** The request's JSON body, read with a schema. An empty body reads as `{}`. */
export const readJsonBody = async <Schema extends z.ZodType>(
    event: H3Event,
    schema: Schema,
    errors?: Partial<Record<string, InputError>>
) => parseInput(schema, (await readBody(event)) ?? {}, errors);

/** Text, trimmed; missing is ''. */
export const text = () => z.string().trim().catch('');

/** A whole number from the query, `fallback` when it's missing or below `min`, and at most `max`. */
export const wholeNumber = (fallback: number, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) =>
    z.coerce
        .number()
        .int()
        .min(min)
        .catch(fallback)
        .transform((value) => Math.min(value, max));

/** Comma-separated ids (`?userIds=a,b`), at most `max` of them, without blanks or repeats. */
export const idList = (max: number) =>
    z
        .string()
        .catch('')
        .transform((value) => [
            ...new Set(
                value
                    .split(',')
                    .map((id) => id.trim())
                    .filter(Boolean)
            )
        ])
        .pipe(z.array(z.string()).max(max));
