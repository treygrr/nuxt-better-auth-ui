// CSV (RFC 4180) for the admin's user export and import: the server writes it, the browser reads it. No Nuxt imports,
// so both can use it.

/**
 * A cell's text, quoted when it needs to be. Text that a spreadsheet would run as a formula (starting with =, +, -, @,
 * a tab or a carriage return) gets a leading `'`, so opening the file can't run anything (OWASP's CSV injection
 * advice). Plain numbers, negative ones included, are left alone.
 */
function cell(value: unknown): string {
    if (value === null || value === undefined) return '';
    let text = value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.join(', ') : String(value);
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Rows of cells as CSV, with CRLF line endings, as RFC 4180 and spreadsheets expect. */
export function toCsv(rows: unknown[][]): string {
    return rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

/** CSV text as rows of cells: quoted cells (with "" for a quote, and line breaks), CRLF or LF, a leading BOM. */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let value = '';
    let quoted = false;
    const input = text.replace(/^﻿/, '');
    for (let index = 0; index < input.length; index++) {
        const char = input[index]!;
        if (quoted) {
            if (char === '"' && input[index + 1] === '"') {
                value += '"';
                index++;
            } else if (char === '"') quoted = false;
            else value += char;
        } else if (char === '"') quoted = true;
        else if (char === ',') {
            row.push(value);
            value = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && input[index + 1] === '\n') index++;
            row.push(value);
            rows.push(row);
            row = [];
            value = '';
        } else value += char;
    }
    if (value !== '' || row.length) {
        row.push(value);
        rows.push(row);
    }
    // Blank lines aren't rows.
    return rows.filter((cells) => cells.some((item) => item.trim() !== ''));
}
