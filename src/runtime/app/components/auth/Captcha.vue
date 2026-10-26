<script setup lang="ts">
import { onBeforeUnmount, onMounted, useRuntimeConfig, useTemplateRef } from '#imports';

/**
 * The captcha widget for Better Auth's Captcha plugin (betterAuthUi.captcha): Cloudflare Turnstile, hCaptcha or
 * Google reCAPTCHA v2. It loads the provider's script in the browser only, and hands its token to the page through
 * `v-model`, which sends it as Better Auth's `x-captcha-response` header. Tokens work once: call `reset()` after a
 * request.
 */
const token = defineModel<string>({ default: '' });
const config = useRuntimeConfig().public.betterAuthUi as {
    captcha: { provider: 'cloudflare-turnstile' | 'hcaptcha' | 'google-recaptcha'; siteKey: string } | false;
    locale?: string;
};

type Widgets = {
    render(element: HTMLElement, options: Record<string, unknown>): string | number;
    reset(id?: string | number): void;
    remove?(id: string | number): void;
};
const PROVIDERS = {
    'cloudflare-turnstile': {
        script: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
        global: 'turnstile'
    },
    hcaptcha: { script: 'https://js.hcaptcha.com/1/api.js?render=explicit', global: 'hcaptcha' },
    'google-recaptcha': { script: 'https://www.google.com/recaptcha/api.js?render=explicit', global: 'grecaptcha' }
} as const;

const element = useTemplateRef<HTMLElement>('element');
let widgets: Widgets | undefined;
let widgetId: string | number | undefined;
let unmounted = false;
let polling: ReturnType<typeof setTimeout> | undefined;

/** How long to wait for the provider's script before giving up: it failed to load, or is blocked. */
const LOAD_TIMEOUT = 30_000;

/** The provider's script, once per page, resolving to its global once it's ready. Stops checking once unmounted. */
function load(provider: keyof typeof PROVIDERS) {
    const { script, global } = PROVIDERS[provider];
    const ready = () => (window as unknown as Record<string, Widgets | undefined>)[global];
    const giveUpAt = Date.now() + LOAD_TIMEOUT;
    return new Promise<Widgets>((resolve, reject) => {
        const fail = (error: Error) => {
            clearTimeout(polling);
            reject(error);
        };
        const wait = () => {
            if (unmounted) return fail(new Error('Unmounted'));
            const found = ready();
            // reCAPTCHA defines its global before it can render.
            if (found && (provider !== 'google-recaptcha' || typeof found.render === 'function')) resolve(found);
            else if (Date.now() > giveUpAt) fail(new Error(`${script} didn't load`));
            else polling = setTimeout(wait, 50);
        };
        if (!document.querySelector(`script[src="${script}"]`)) {
            const tag = document.createElement('script');
            tag.src = script;
            tag.async = true;
            tag.onerror = () => fail(new Error(`Couldn't load ${script}`));
            document.head.appendChild(tag);
        }
        wait();
    });
}

onMounted(async () => {
    if (!config.captcha || !element.value) return;
    try {
        widgets = await load(config.captcha.provider);
    } catch (error) {
        if (!unmounted) console.error('[better-auth-ui] The captcha could not load', error);
        return;
    }
    // Unmounted while the script loaded: nothing to render into.
    if (unmounted || !element.value) return;
    widgetId = widgets.render(element.value, {
        sitekey: config.captcha.siteKey,
        // Turnstile and hCaptcha take a language; reCAPTCHA reads the page's.
        language: config.locale,
        hl: config.locale,
        callback: (value: string) => (token.value = value),
        'expired-callback': () => (token.value = ''),
        'error-callback': () => (token.value = '')
    });
});

onBeforeUnmount(() => {
    unmounted = true;
    clearTimeout(polling);
    if (widgetId !== undefined) widgets?.remove?.(widgetId);
});

defineExpose({
    /** A fresh challenge, after the token was used. */
    reset() {
        token.value = '';
        if (widgetId !== undefined) widgets?.reset(widgetId);
    }
});
</script>

<template>
    <!-- Filled in the browser by the provider's script. -->
    <div v-if="config.captcha" ref="element" class="flex justify-center min-h-16" />
</template>
