import { computed, useNuxtApp, useRuntimeConfig } from '#imports';

import { adminEn } from './admin.en';
import { adminEs } from './admin.es';
import { authEn } from './auth.en';
import { authEs } from './auth.es';

/**
 * The module's own words, in English and Spanish. Kept small and dependency-free: pages call `t('signIn.title')`.
 * The language is `betterAuthUi.locale`, or, when the app uses @nuxtjs/i18n, its current language (when supported).
 */
const en = { ...authEn, admin: adminEn };
export type Messages = DeepStrings<typeof en>;

const dictionaries = {
    en,
    es: { ...authEs, admin: adminEs } satisfies Messages
};
export type Locale = keyof typeof dictionaries;
export const LOCALES = Object.keys(dictionaries) as Locale[];

/** The same shape, with every leaf a string: what a translation must provide. */
type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
/** Every key, eg `'signIn.title'`. */
type Paths<T, Prefix extends string = ''> = {
    [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
export type MessageKey = Paths<typeof en>;
export type MessageParams = Record<string, string | number>;

const lookup = (messages: unknown, key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages) as
        string | undefined;

/** Replaces `{name}` with params.name. */
const interpolate = (text: string, params?: MessageParams) =>
    params ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : text;

/**
 * The app's own words (`betterAuthUi.messages`): per language, any key, eg `{ en: { 'account.tabs.organizations':
 * 'Teams' } }`. A language the module doesn't have works too, with English for the keys it leaves out.
 */
export type MessageOverrides = Record<string, Partial<Record<MessageKey, string>> & Record<string, string>>;

/** A supported locale from a code such as `es-MX` (the module's, or one the app gave words for), else English. */
export const resolveLocale = (code: string | undefined, extra: string[] = []): string => {
    const lower = (code ?? '').toLowerCase();
    const base = lower.slice(0, 2);
    const known = [...(LOCALES as string[]), ...extra.map((locale) => locale.toLowerCase())];
    return known.includes(lower) ? lower : known.includes(base) ? base : 'en';
};

export function useAuthI18n() {
    const { locale: configured, messages: overrides = {} } = useRuntimeConfig().public.betterAuthUi as {
        locale?: string;
        messages?: MessageOverrides;
    };
    // @nuxtjs/i18n, when the app uses it, decides the language as the visitor switches it.
    const i18n = (useNuxtApp() as unknown as { $i18n?: { locale: { value: string } } }).$i18n;
    const locale = computed(() => resolveLocale(i18n?.locale.value ?? configured, Object.keys(overrides)));
    /** The app's word first, then the module's in the language, then English. */
    const word = (key: string) =>
        overrides[locale.value]?.[key] ??
        lookup(dictionaries[locale.value as Locale], key) ??
        overrides.en?.[key] ??
        lookup(en, key);

    const t = (key: MessageKey, params?: MessageParams) => interpolate(word(key) ?? key, params);

    /**
     * An error in words: by its code when there's a translation (Better Auth's, eg `INVALID_EMAIL_OR_PASSWORD`, and
     * the module's own routes'), else its own message.
     */
    const errorMessage = (error: { code?: string; message?: string } | null | undefined) => {
        if (!error) return '';
        const translated = error.code ? word(`errors.${error.code}`) : undefined;
        return translated ?? error.message ?? t('errors.generic');
    };

    return { t, locale, errorMessage };
}
