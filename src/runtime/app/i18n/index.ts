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

/** A supported locale from a code such as `es-MX`, else English. */
export const resolveLocale = (code: string | undefined): Locale => {
    const base = (code ?? '').slice(0, 2).toLowerCase();
    return (LOCALES as string[]).includes(base) ? (base as Locale) : 'en';
};

export function useAuthI18n() {
    const { locale: configured } = useRuntimeConfig().public.betterAuthUi as { locale?: string };
    // @nuxtjs/i18n, when the app uses it, decides the language as the visitor switches it.
    const i18n = (useNuxtApp() as unknown as { $i18n?: { locale: { value: string } } }).$i18n;
    const locale = computed(() => resolveLocale(i18n?.locale.value ?? configured));

    const t = (key: MessageKey, params?: MessageParams) =>
        interpolate(lookup(dictionaries[locale.value], key) ?? lookup(en, key) ?? key, params);

    /**
     * A Better Auth error in words: by its code when there's a translation (eg `INVALID_EMAIL_OR_PASSWORD`), else
     * its own message.
     */
    const errorMessage = (error: { code?: string; message?: string } | null | undefined) => {
        if (!error) return '';
        const translated = error.code ? lookup(dictionaries[locale.value], `errors.${error.code}`) : undefined;
        return translated ?? error.message ?? t('errors.generic');
    };

    return { t, locale, errorMessage };
}
