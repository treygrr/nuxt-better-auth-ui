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
        }),
        'email-code': ({ otp, type }) => ({
            subject: {
                'sign-in': `Your sign-in code: ${otp}`,
                'email-verification': `Your verification code: ${otp}`,
                'forget-password': `Your password reset code: ${otp}`,
                'change-email': `Your code to change your email: ${otp}`
            }[type],
            text: `Hi,\n\n${
                {
                    'sign-in': 'Your code to sign in is',
                    'email-verification': 'Your code to verify your email is',
                    'forget-password': 'Your code to reset your password is',
                    'change-email': 'Your code to confirm your new email is'
                }[type]
            }:\n\n${otp}\n\nIt expires in a few minutes. If you didn't ask for it, you can ignore this email.`
        }),
        'new-sign-in': ({ user, device, ipAddress, time, accountUrl }) => ({
            subject: `New sign-in from ${device}`,
            text: `Hi ${user.name},\n\nYour account was just signed in to from a device it hasn't used before:\n\n${device}${ipAddress ? `, from ${ipAddress}` : ''}\n${time}\n\nIf this was you, there's nothing to do. If it wasn't, change your password and sign that device out:\n\n${accountUrl}`
        }),
        'password-changed': ({ user, time, accountUrl }) => ({
            subject: 'Your password was changed',
            text: `Hi ${user.name},\n\nThe password for your account was changed (${time}).\n\nIf this was you, there's nothing to do. If it wasn't, reset your password now and check where you're signed in:\n\n${accountUrl}`
        }),
        'two-factor-changed': ({ user, enabled, time, accountUrl }) => ({
            subject: enabled ? 'Two-factor authentication is on' : 'Two-factor authentication was turned off',
            text: enabled
                ? `Hi ${user.name},\n\nTwo-factor authentication was turned on for your account (${time}). You'll be asked for a code when you sign in.\n\nIf this wasn't you, check your account now:\n\n${accountUrl}`
                : `Hi ${user.name},\n\nTwo-factor authentication was turned off for your account (${time}). Signing in now only needs your password.\n\nIf this wasn't you, change your password and turn it back on:\n\n${accountUrl}`
        }),
        'passkey-added': ({ user, name, time, accountUrl }) => ({
            subject: 'A passkey was added to your account',
            text: `Hi ${user.name},\n\nA passkey${name ? ` ("${name}")` : ''} was added to your account (${time}). It can sign in without your password.\n\nIf this wasn't you, remove it now and change your password:\n\n${accountUrl}`
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
        }),
        'email-code': ({ otp, type }) => ({
            subject: {
                'sign-in': `Tu código para iniciar sesión: ${otp}`,
                'email-verification': `Tu código de verificación: ${otp}`,
                'forget-password': `Tu código para restablecer la contraseña: ${otp}`,
                'change-email': `Tu código para cambiar tu correo: ${otp}`
            }[type],
            text: `Hola:\n\n${
                {
                    'sign-in': 'Tu código para iniciar sesión es',
                    'email-verification': 'Tu código para verificar tu correo es',
                    'forget-password': 'Tu código para restablecer tu contraseña es',
                    'change-email': 'Tu código para confirmar tu nuevo correo es'
                }[type]
            }:\n\n${otp}\n\nCaduca en unos minutos. Si no lo pediste, puedes ignorar este correo.`
        }),
        'new-sign-in': ({ user, device, ipAddress, time, accountUrl }) => ({
            subject: `Nuevo inicio de sesión desde ${device}`,
            text: `Hola, ${user.name}:\n\nAcaban de iniciar sesión en tu cuenta desde un dispositivo que no había usado antes:\n\n${device}${ipAddress ? `, desde ${ipAddress}` : ''}\n${time}\n\nSi fuiste tú, no tienes que hacer nada. Si no, cambia tu contraseña y cierra la sesión en ese dispositivo:\n\n${accountUrl}`
        }),
        'password-changed': ({ user, time, accountUrl }) => ({
            subject: 'Se cambió tu contraseña',
            text: `Hola, ${user.name}:\n\nSe cambió la contraseña de tu cuenta (${time}).\n\nSi fuiste tú, no tienes que hacer nada. Si no, restablece tu contraseña ahora y revisa dónde tienes la sesión iniciada:\n\n${accountUrl}`
        }),
        'two-factor-changed': ({ user, enabled, time, accountUrl }) => ({
            subject: enabled
                ? 'La verificación en dos pasos está activada'
                : 'Se desactivó la verificación en dos pasos',
            text: enabled
                ? `Hola, ${user.name}:\n\nSe activó la verificación en dos pasos en tu cuenta (${time}). Te pediremos un código cuando inicies sesión.\n\nSi no fuiste tú, revisa tu cuenta ahora:\n\n${accountUrl}`
                : `Hola, ${user.name}:\n\nSe desactivó la verificación en dos pasos en tu cuenta (${time}). Ahora para iniciar sesión solo se necesita tu contraseña.\n\nSi no fuiste tú, cambia tu contraseña y vuelve a activarla:\n\n${accountUrl}`
        }),
        'passkey-added': ({ user, name, time, accountUrl }) => ({
            subject: 'Se agregó una llave de acceso a tu cuenta',
            text: `Hola, ${user.name}:\n\nSe agregó una llave de acceso${name ? ` («${name}»)` : ''} a tu cuenta (${time}). Con ella se puede iniciar sesión sin tu contraseña.\n\nSi no fuiste tú, quítala ahora y cambia tu contraseña:\n\n${accountUrl}`
        })
    }
};
