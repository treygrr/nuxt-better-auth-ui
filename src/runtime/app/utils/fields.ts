import { upperFirst } from 'scule';

/** One of the app's own fields (Better Auth's `additionalFields`): its name, type, and whether it's required or editable. */
export type AppField = { name: string; type: string | string[]; required: boolean; editable: boolean };

/** "favoriteGame" → "Favorite game". */
export const fieldLabel = (name: string) => upperFirst(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase());

export const isEmptyValue = (value: unknown) => value === null || value === undefined || value === '';

/** A value as a form holds it: text for most types, a boolean for switches, `YYYY-MM-DD` for dates. */
export function toFieldInput(field: AppField, value: unknown): string | boolean {
    if (field.type === 'boolean') return value === true;
    if (isEmptyValue(value)) return '';
    if (field.type === 'date') return new Date(value as string).toISOString().slice(0, 10);
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
}

/** A form's input back into the field's type; empty is null. */
export function fromFieldInput(field: AppField, input: string | boolean | undefined): unknown {
    if (field.type === 'boolean') return input === true;
    const text = String(input ?? '').trim();
    if (!text) return null;
    if (field.type === 'number') return Number(text);
    if (field.type === 'date') return new Date(text).toISOString();
    if (field.type === 'string[]' || field.type === 'number[]') {
        const items = text
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        return field.type === 'number[]' ? items.map(Number) : items;
    }
    return text;
}

/** The editable fields' values from a form, ready for Better Auth (empty optional fields left out). */
export const fieldValues = (fields: AppField[], form: Record<string, string | boolean>) =>
    Object.fromEntries(
        fields
            .filter((field) => field.editable)
            .map((field) => [field.name, fromFieldInput(field, form[field.name])] as const)
            .filter(([, value]) => value !== null)
    );
