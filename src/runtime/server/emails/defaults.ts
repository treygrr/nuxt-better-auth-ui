import type { BetterAuthEmailName, BetterAuthEmails } from './types';

type Defaults = {
    [Name in BetterAuthEmailName]: (data: BetterAuthEmails[Name]) => { subject: string; text: string };
};

/** The plain-text emails sent when the app has no template for one, in each language `betterAuthUi.locale` takes. */
export const defaultEmails: Record<'en' | 'es', Defaults> = {
    en: {
        'verify-email': ({ user, url }) => ({
            subject: 'Verify your email address',
            text: `Hi ${user.name},\n\nConfirm your email address by opening this link:\n\n${url}\n\nIf you didn't create an account, you can ignore this email.`
        }),
        'reset-password': ({ user, url }) => ({
            subject: 'Reset your password',
            text: `Hi ${user.name},\n\nSomeone asked to reset your password. Choose a new one here:\n\n${url}\n\nIf it wasn't you, you can ignore this email; your password hasn't changed.`
        }),
        'change-email-confirmation': ({ user, newEmail, url }) => ({
            subject: 'Approve your email change',
            text: `Hi ${user.name},\n\nSomeone asked to change your account's email address to ${newEmail}. If it was you, approve it here:\n\n${url}\n\nIf it wasn't you, ignore this email; your email address stays the same.`
        }),
        'delete-account': ({ user, url }) => ({
            subject: 'Confirm deleting your account',
            text: `Hi ${user.name},\n\nOpen this link to permanently delete your account and everything in it:\n\n${url}\n\nIf you didn't ask for this, ignore this email; your account stays as it is.`
        }),
        'two-factor-code': ({ user, otp }) => ({
            subject: `Your sign-in code: ${otp}`,
            text: `Hi ${user.name},\n\nYour sign-in code is:\n\n${otp}\n\nIt expires in a few minutes. If you didn't just sign in, change your password: someone else knows it.`
        }),
        'magic-link': ({ url }) => ({
            subject: 'Your sign-in link',
            text: `Hi,\n\nOpen this link to sign in:\n\n${url}\n\nIt works once and expires in a few minutes. If you didn't ask for it, you can ignore this email.`
        }),
        'existing-user-sign-up': ({ user }) => ({
            subject: 'Someone tried to sign up with your email',
            text: `Hi ${user.name},\n\nSomeone tried to create an account with your email address, but you already have one. If it was you, sign in instead, or reset your password if you've forgotten it.\n\nIf it wasn't you, you can ignore this email.`
        })
    },
    es: {
        'verify-email': ({ user, url }) => ({
            subject: 'Verifica tu correo',
            text: `Hola, ${user.name}:\n\nConfirma tu correo abriendo este enlace:\n\n${url}\n\nSi no creaste una cuenta, puedes ignorar este correo.`
        }),
        'reset-password': ({ user, url }) => ({
            subject: 'Restablece tu contraseña',
            text: `Hola, ${user.name}:\n\nAlguien pidió restablecer tu contraseña. Elige una nueva aquí:\n\n${url}\n\nSi no fuiste tú, puedes ignorar este correo; tu contraseña no cambió.`
        }),
        'change-email-confirmation': ({ user, newEmail, url }) => ({
            subject: 'Aprueba el cambio de tu correo',
            text: `Hola, ${user.name}:\n\nAlguien pidió cambiar el correo de tu cuenta a ${newEmail}. Si fuiste tú, apruébalo aquí:\n\n${url}\n\nSi no fuiste tú, ignora este correo; tu correo se mantiene igual.`
        }),
        'delete-account': ({ user, url }) => ({
            subject: 'Confirma que quieres eliminar tu cuenta',
            text: `Hola, ${user.name}:\n\nAbre este enlace para eliminar para siempre tu cuenta y todo lo que contiene:\n\n${url}\n\nSi no lo pediste, ignora este correo; tu cuenta se queda como está.`
        }),
        'two-factor-code': ({ user, otp }) => ({
            subject: `Tu código para iniciar sesión: ${otp}`,
            text: `Hola, ${user.name}:\n\nTu código para iniciar sesión es:\n\n${otp}\n\nCaduca en unos minutos. Si no acabas de iniciar sesión, cambia tu contraseña: alguien más la conoce.`
        }),
        'magic-link': ({ url }) => ({
            subject: 'Tu enlace para iniciar sesión',
            text: `Hola:\n\nAbre este enlace para iniciar sesión:\n\n${url}\n\nFunciona una sola vez y caduca en unos minutos. Si no lo pediste, puedes ignorar este correo.`
        }),
        'existing-user-sign-up': ({ user }) => ({
            subject: 'Alguien intentó registrarse con tu correo',
            text: `Hola, ${user.name}:\n\nAlguien intentó crear una cuenta con tu correo, pero ya tienes una. Si fuiste tú, mejor inicia sesión, o restablece tu contraseña si la olvidaste.\n\nSi no fuiste tú, puedes ignorar este correo.`
        })
    }
};
