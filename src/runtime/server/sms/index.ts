/// <reference path="./virtual.d.ts" />
// Public entry, `@treygrr/nuxt-better-auth-ui/sms`, for the app's SMS sender.
// No Nuxt or Nitro imports: Better Auth's Nuxt module also loads the auth config at build time.

/** The texts the module sends: a code to sign in or verify a phone number, and one to reset a password. */
export type SmsName = 'phone-code' | 'phone-reset';

/** A text to deliver: `text` is the module's wording, in the app's language; `code` is there to write your own. */
export type SmsMessage = { to: string; text: string; sms: SmsName; code: string };

/** Delivers a text (Twilio, Vonage, AWS SNS, …). */
export type SmsSender = (message: SmsMessage) => void | Promise<void>;

/** Declares the function that delivers texts: `export default defineBetterAuthSmsSender(async ({ to, text }) => …)`. */
export const defineBetterAuthSmsSender = (send: SmsSender): SmsSender => send;

type Locale = 'en' | 'es';
type Words = { app: string; code: string; minutes: number };

/** Short, as texts should be: the code first, so phones can offer to fill it in. */
const defaults: Record<Locale, Record<SmsName, (words: Words) => string>> = {
    en: {
        'phone-code': ({ app, code, minutes }) =>
            `${code} is your ${app} code. It expires in ${minutes} minutes. Don't share it with anyone.`,
        'phone-reset': ({ app, code, minutes }) =>
            `${code} is your ${app} code to reset your password. It expires in ${minutes} minutes. Didn't ask? Ignore this.`
    },
    es: {
        'phone-code': ({ app, code, minutes }) =>
            `${code} es tu código de ${app}. Caduca en ${minutes} minutos. No se lo des a nadie.`,
        'phone-reset': ({ app, code, minutes }) =>
            `${code} es tu código de ${app} para restablecer tu contraseña. Caduca en ${minutes} minutos. ¿No lo pediste? Ignóralo.`
    }
};

type SmsConfig = { send?: SmsSender; locale?: Locale };

/** Better Auth's endpoint context, as its Phone Number plugin hands it to `sendOTP`: for the app's name. */
type Context = { context?: { appName?: string } } | undefined;

async function deliver(sms: SmsName, to: string, code: string, words: Omit<Words, 'code'>) {
    // Loaded here, not at the top: the config only exists inside the built server.
    const { smsConfig } = (await import('#better-auth-ui/sms-config')) as { smsConfig: SmsConfig };
    if (!smsConfig.send)
        throw new Error('[better-auth-ui] No SMS sender: set betterAuthUi.sms.send to a file exporting one');
    const text = (defaults[smsConfig.locale ?? 'en'] ?? defaults.en)[sms]({ ...words, code });
    await smsConfig.send({ to, text, sms, code });
}

/**
 * Better Auth's Phone Number plugin's `sendOTP` and `sendPasswordResetOTP`, sending in the background (as its docs
 * advise: waiting would reveal through timing which numbers have accounts). `expiresIn` is the plugin's, in seconds.
 */
export const betterAuthSms = (expiresIn = 300) => {
    const send = (sms: SmsName) => (data: { phoneNumber: string; code: string }, ctx?: Context) => {
        const words = { app: ctx?.context?.appName || 'Better Auth', minutes: Math.max(1, Math.round(expiresIn / 60)) };
        deliver(sms, data.phoneNumber, data.code, words).catch((error) =>
            console.error(`[better-auth-ui] Couldn't send the "${sms}" text`, error)
        );
    };
    return { phoneCode: send('phone-code'), resetCode: send('phone-reset') };
};
