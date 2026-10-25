/** The sign-in, account and two-factor pages' words, in Spanish: the same keys as auth.en.ts. */
export const authEs = {
    common: {
        email: 'Correo',
        password: 'Contraseña',
        name: 'Nombre',
        username: 'Nombre de usuario',
        back: 'Volver',
        backToSignIn: 'Volver a iniciar sesión',
        verify: 'Verificar',
        save: 'Guardar',
        cancel: 'Cancelar',
        continue: 'Continuar',
        on: 'Activada',
        off: 'Desactivada'
    },
    password: {
        minimum: 'Al menos {min} caracteres.',
        breachChecked: 'La revisaremos contra filtraciones de datos conocidas.'
    },
    captcha: {
        required: 'Completa la verificación de arriba para demostrar que no eres un bot.'
    },
    signIn: {
        title: 'Iniciar sesión',
        emailOrUsername: 'Correo o nombre de usuario',
        submit: 'Iniciar sesión',
        noAccount: '¿Aún no tienes cuenta?',
        signUp: 'Regístrate',
        forgotPassword: '¿Olvidaste tu contraseña?',
        passkey: 'Iniciar sesión con una llave de acceso',
        continueWith: 'Continuar con {provider}',
        lastUsed: 'La última vez iniciaste sesión con {method}.',
        methods: {
            password: 'tu contraseña',
            passkey: 'una llave de acceso',
            magicLink: 'un enlace de inicio de sesión',
            emailCode: 'un código por correo',
            phone: 'un código por SMS'
        },
        phone: {
            button: 'Enviarme un código por SMS',
            title: 'Inicia sesión con tu teléfono',
            description: 'Te enviaremos por SMS un código para escribirlo aquí.',
            label: 'Número de teléfono',
            placeholder: '+34 612 345 678',
            submit: 'Enviar código',
            failed: 'No se pudo enviar el código',
            enterDescription: 'Enviamos un código a {phone}. Caduca en unos minutos.',
            noAccount: 'Ninguna cuenta tiene ese número. Inicia sesión de otra forma y añádelo desde tu cuenta.'
        },
        verifyFirst: {
            title: 'Primero verifica tu correo',
            description: 'Te enviamos un nuevo enlace de verificación. Ábrelo y luego inicia sesión.'
        },
        failed: 'No se pudo iniciar sesión',
        magicLink: {
            button: 'Envíame un enlace para iniciar sesión',
            title: 'Iniciar sesión con un enlace',
            description: 'Te enviaremos por correo un enlace que inicia tu sesión. Sin contraseña.',
            submit: 'Enviar enlace',
            failed: 'No se pudo enviar el enlace',
            usePassword: 'Usar mi contraseña',
            sentTitle: 'Revisa tu correo',
            sentDescription:
                'Enviamos un enlace para iniciar sesión a {email}. Funciona una sola vez y caduca en unos minutos.'
        },
        emailCode: {
            button: 'Envíame un código',
            title: 'Iniciar sesión con un código',
            description:
                'Te enviaremos por correo un código para escribir aquí. Útil en un dispositivo donde no tienes tu correo.',
            submit: 'Enviar código',
            failed: 'No se pudo enviar el código',
            enterTitle: 'Escribe tu código',
            enterDescription: 'Enviamos un código a {email}. Caduca en unos minutos.',
            codeLabel: 'Código',
            wrongCode: 'No se pudo iniciar sesión con ese código',
            resend: 'Enviar un código nuevo',
            resent: 'Código nuevo enviado'
        },
        guest: {
            button: 'Continuar como invitado',
            failed: 'No se pudo crear una cuenta de invitado',
            keepTitle: 'Estás usando una cuenta de invitado',
            keepDescription: 'Inicia sesión o crea una cuenta para conservarla, con todo lo que hiciste como invitado.'
        }
    },
    signUp: {
        title: 'Crea una cuenta',
        usernameHelp: 'Letras, números, _ y . (de {min} a {max} caracteres).',
        submit: 'Crear cuenta',
        haveAccount: '¿Ya tienes una?',
        signIn: 'Inicia sesión',
        failed: 'No se pudo crear tu cuenta',
        checkEmail: {
            title: 'Revisa tu correo',
            description: 'Enviamos un enlace a {email}. Ábrelo para verificar tu correo y terminar de crear tu cuenta.'
        },
        closed: {
            title: 'Los registros están cerrados',
            description: 'Por ahora no se pueden crear cuentas nuevas.'
        }
    },
    forgotPassword: {
        title: '¿Olvidaste tu contraseña?',
        description: 'Te enviaremos por correo un enlace para elegir una nueva.',
        submit: 'Enviar enlace',
        sentTitle: 'Revisa tu correo',
        sentDescription: 'Si {email} tiene una cuenta, le enviamos un enlace para elegir una contraseña nueva.',
        remembered: '¿Ya la recordaste?',
        failed: 'No se pudo enviar el enlace'
    },
    resetPassword: {
        title: 'Elige una contraseña nueva',
        newPassword: 'Contraseña nueva',
        submit: 'Cambiar contraseña',
        doneTitle: 'Contraseña cambiada',
        doneDescription: 'Inicia sesión con tu contraseña nueva.',
        brokenTitle: 'Este enlace no funciona',
        brokenDescription: 'Puede que haya caducado o que ya se haya usado. Pide uno nuevo.',
        newLink: 'Enviar un enlace nuevo',
        failed: 'No se pudo cambiar tu contraseña'
    },
    invitation: {
        title: 'Invitación',
        heading: 'Únete a {name}',
        description: '{inviter} te invitó a unirte como {role}.',
        accept: 'Aceptar',
        decline: 'Rechazar',
        answered: 'Esta invitación ya se respondió.',
        unavailable: 'Esta invitación no está disponible',
        joined: 'Te uniste a {name}',
        declined: 'Invitación rechazada',
        toOrganizations: 'Ir a tus organizaciones'
    },
    device: {
        title: 'Conectar un dispositivo',
        description: 'Escribe el código que muestra tu dispositivo para iniciar sesión en él con tu cuenta.',
        codeLabel: 'Código',
        submit: 'Continuar',
        reviewTitle: '¿Iniciar sesión en este dispositivo?',
        reviewDescription: '{app} pide iniciar sesión con tu cuenta.',
        app: 'Aplicación',
        access: 'Acceso',
        fullAccess: 'Tu cuenta',
        code: 'Código',
        warning:
            'Aprueba solo si lo iniciaste tú en un dispositivo que tienes contigo y el código coincide. Nunca apruebes un código que te haya enviado alguien.',
        approve: 'Aprobar',
        deny: 'Rechazar',
        anotherCode: 'Escribir otro código',
        approvedTitle: 'Dispositivo conectado',
        approvedDescription: 'Vuelve a tu dispositivo: iniciará sesión en unos segundos.',
        deniedTitle: 'Solicitud rechazada',
        deniedDescription: 'Ese dispositivo no iniciará sesión.',
        errors: {
            invalid: 'Ese código no es correcto. Revísalo en tu dispositivo.',
            expired: 'Ese código caducó. Pide uno nuevo en tu dispositivo.',
            used: 'Ese código ya se usó. Pide uno nuevo en tu dispositivo.',
            otherAccount: 'Otra cuenta está usando ese código.',
            failed: 'No funcionó. Inténtalo de nuevo.'
        }
    },
    twoFactorPage: {
        title: 'Verificación en dos pasos',
        totp: {
            title: 'Escribe tu código',
            description: 'Abre tu app de autenticación y escribe el código de 6 dígitos de esta cuenta.'
        },
        otp: {
            title: 'Revisa tu correo',
            description: 'Podemos enviarte un código de 6 dígitos por correo para terminar de iniciar sesión.',
            send: 'Envíame un código'
        },
        backup: {
            title: 'Usa un código de respaldo',
            description:
                'Escribe uno de los códigos de respaldo que guardaste al activar la verificación en dos pasos. Cada uno funciona una vez.',
            label: 'Código de respaldo'
        },
        codeLabel: 'Código',
        trust: {
            label: 'Confiar en este dispositivo',
            description: 'No volver a pedir un código aquí durante un tiempo.'
        },
        expired: {
            title: 'Este inicio de sesión caducó',
            description: 'Vuelve a iniciar sesión para recibir un código nuevo.'
        },
        failed: 'No funcionó',
        useApp: 'Usar mi app de autenticación',
        useEmail: 'Mejor envíame un código por correo',
        useBackup: 'Usar un código de respaldo'
    },
    account: {
        title: 'Tu cuenta',
        signOut: 'Cerrar sesión',
        tabs: {
            profile: 'Perfil',
            security: 'Seguridad',
            devices: 'Dispositivos',
            delete: 'Eliminar',
            apiKeys: 'Claves de API',
            organizations: 'Organizaciones',
            billing: 'Facturación',
            actionNeeded: 'Requiere acción'
        },
        billing: {
            title: 'Tu plan',
            description: 'Tu suscripción. Stripe gestiona los pagos, las facturas y las tarjetas.',
            none: 'No tienes suscripción. Elige un plan abajo.',
            active: 'Activo',
            trial: 'Prueba gratuita',
            renewsOn: 'Se renueva el',
            endsOn: 'Termina el',
            cancel: 'Cancelar plan',
            resume: 'Mantener mi plan',
            resumed: 'Tu plan continúa',
            portal: 'Facturas y pagos',
            plans: 'Planes',
            yearly: 'Pagar anualmente',
            trialDays: 'Prueba gratuita de {count} días',
            yourPlan: 'Tu plan',
            choose: 'Elegir',
            switch: 'Cambiar a este plan',
            failed: 'No funcionó'
        },
        organizations: {
            title: 'Organizaciones',
            description: 'Las organizaciones a las que perteneces. La activa es en la que trabaja la aplicación.',
            none: 'Aún no perteneces a ninguna organización.',
            active: 'Activa',
            switch: 'Cambiar a esta',
            switched: 'Ahora estás en {name}',
            manage: 'Gestionar',
            create: 'Crear organización',
            createTitle: 'Crear una organización',
            name: 'Nombre',
            slug: 'Identificador',
            slugHelp: 'Minúsculas, números y guiones, para su dirección.',
            created: 'Se creó {name}',
            failed: 'No funcionó',
            invitationsTitle: 'Invitaciones',
            invitationsDescription: 'Organizaciones que te invitaron. Te unirás con el rol indicado.',
            asRole: 'Como {role}',
            accept: 'Aceptar',
            decline: 'Rechazar',
            joinedName: 'Te uniste a {name}',
            declined: 'Invitación rechazada',
            members: 'Miembros ({count})',
            you: 'tú',
            role: 'Rol',
            roleChanged: 'Rol cambiado',
            remove: 'Quitar a {name}',
            removed: 'Se quitó a {name}',
            invite: 'Invitar a alguien',
            inviteEmail: 'Su correo',
            sendInvite: 'Invitar',
            invited: 'Se invitó a {email}',
            expires: 'caduca',
            copyLink: 'Copiar el enlace de la invitación',
            linkCopied: 'Enlace de la invitación copiado',
            cancelInvite: 'Cancelar',
            inviteCancelled: 'Invitación cancelada',
            leave: 'Salir',
            leaveTitle: '¿Salir de {name}?',
            leaveDescription: 'Perderás el acceso hasta que alguien te vuelva a invitar.',
            left: 'Saliste de {name}',
            delete: 'Eliminar organización',
            deleteTitle: '¿Eliminar {name}?',
            deleteDescription: 'Se eliminan para siempre sus miembros, invitaciones y todo lo demás.',
            deleted: 'Se eliminó {name}'
        },
        phone: {
            title: 'Número de teléfono',
            description: 'Para iniciar sesión con un código por SMS.',
            none: 'Aún no tienes número de teléfono.',
            verified: 'Verificado',
            unverified: 'Sin verificar',
            add: 'Añadir un número de teléfono',
            change: 'Cambiar',
            remove: 'Quitar',
            label: 'Número de teléfono',
            placeholder: '+34 612 345 678',
            send: 'Enviarme un código',
            enterDescription: 'Escribe el código que enviamos a {phone}.',
            codeLabel: 'Código',
            verify: 'Verificar',
            saved: 'Número de teléfono guardado',
            removed: 'Número de teléfono quitado',
            failed: 'No funcionó'
        },
        apiKeys: {
            title: 'Claves de API',
            description:
                'Las claves permiten que tus scripts, bots e integraciones usen tu cuenta. Mantenlas en secreto, como una contraseña.',
            none: 'Aún no tienes claves de API.',
            unnamed: 'Clave sin nombre',
            create: 'Crear clave',
            createTitle: 'Crear una clave de API',
            name: 'Nombre',
            namePlaceholder: 'p. ej. Script de despliegue',
            expiry: 'Caduca',
            days: 'En {count} días',
            never: 'Nunca',
            permissions: 'Permisos',
            permissionsHint: 'Dale solo lo que necesita.',
            createdTitle: 'Copia tu nueva clave',
            createdDescription: 'No se volverá a mostrar. Guárdala en un lugar seguro, como un gestor de contraseñas.',
            copy: 'Copiar',
            copied: 'Copiada',
            done: 'Listo',
            createFailed: 'No se pudo crear la clave',
            lastUsed: 'Último uso',
            neverUsed: 'Nunca usada',
            expires: 'caduca',
            noExpiry: 'no caduca',
            expired: 'Caducada',
            revoke: 'Revocar',
            revokeTitle: '¿Revocar esta clave?',
            revokeDescription: 'Todo lo que use “{name}” deja de funcionar al momento.',
            revoked: 'Clave revocada',
            revokeFailed: 'No se pudo revocar la clave'
        },
        required: {
            title: 'Activa la verificación en dos pasos',
            description: 'Tu cuenta la requiere. Actívala en Seguridad para seguir usando el sitio.',
            action: 'Activarla'
        },
        guest: {
            badge: 'Invitado',
            title: 'Estás usando una cuenta de invitado',
            description:
                'Crea una cuenta o inicia sesión para conservarla, con todo lo que hiciste como invitado. Si cierras sesión, no podrás volver a una cuenta de invitado.',
            signUp: 'Crear una cuenta',
            signIn: 'Iniciar sesión',
            delete: 'Borrar cuenta de invitado',
            deleteTitle: '¿Borrar esta cuenta de invitado?',
            deleteDescription: 'Se borra todo lo que hiciste como invitado y se cierra tu sesión.',
            deleteFailed: 'No se pudo borrar la cuenta de invitado'
        },
        passkeySession: {
            title: 'Iniciaste sesión con tu llave de acceso',
            description:
                'Con eso basta. Para iniciar sesión también con tu contraseña, activa la verificación en dos pasos: tu cuenta pide un código después de la contraseña.'
        },
        overview: {
            email: 'Correo',
            verified: 'Verificado',
            unverified: 'Sin verificar',
            twoFactor: 'Dos pasos',
            required: 'Obligatoria',
            passkeys: 'Llaves de acceso',
            noneYet: 'Ninguna aún',
            methods: 'Métodos de inicio de sesión',
            devices: 'Dispositivos',
            signedIn: '{count} con sesión iniciada',
            memberSince: 'Miembro desde'
        },
        profile: {
            title: 'Perfil',
            description: 'Cómo te ven los demás.',
            avatar: 'URL del avatar',
            saved: 'Perfil guardado',
            failed: 'No se pudo guardar tu perfil',
            usernameLocked: 'El nombre de usuario no se puede cambiar una vez elegido.'
        },
        email: {
            notVerified: 'Sin verificar',
            verifyHint: 'Verifica tu correo para poder recuperar tu cuenta.',
            resend: 'Enviar enlace de verificación',
            resent: 'Enlace de verificación enviado',
            resendFailed: 'No se pudo enviar el enlace',
            checkTitle: 'Revisa tu correo',
            approvalFirst:
                'Enviamos un enlace a {current} para aprobar el cambio; después le pediremos a {next} que lo confirme. Tu correo no cambia hasta entonces.',
            confirmNew:
                'Abre el enlace que enviamos a {next} para terminar de cambiar tu correo. Tu correo actual se mantiene hasta entonces.',
            newEmail: 'Correo nuevo',
            change: 'Cambiar correo'
        },
        password: {
            description: 'Cambia la contraseña con la que inicias sesión.',
            connectedOnly: 'Inicias sesión con una cuenta conectada.',
            current: 'Contraseña actual',
            changed: 'Contraseña cambiada',
            othersSignedOut: 'Se cerró la sesión en tus otros dispositivos.',
            signOutOthers: 'Cerrar sesión en mis otros dispositivos',
            setLinkSent: 'Enviamos a {email} un enlace para crear una contraseña.',
            addHint: 'Agrega una contraseña para iniciar sesión también con tu correo.',
            sendSetLink: 'Envíame un enlace para crearla'
        },
        passkeys: {
            title: 'Llaves de acceso',
            description:
                'Inicia sesión con tu huella, tu rostro, el bloqueo de pantalla o una llave de seguridad en lugar de una contraseña.',
            unsupported: 'Este navegador no puede usar llaves de acceso',
            added: 'Llave de acceso agregada',
            addedHint: 'Ya puedes iniciar sesión con ella.',
            renameFailed: 'No se pudo cambiar el nombre',
            removeFailed: 'No se pudo quitar',
            removed: 'Se quitó {name}',
            defaultName: 'Llave de acceso',
            nameLabel: 'Nombre de la llave de acceso',
            synced: 'Sincronizada',
            oneDevice: 'En un solo dispositivo',
            added_on: 'agregada el',
            rename: 'Cambiar nombre',
            remove: 'Quitar',
            namePlaceholder: 'Ponle un nombre (opcional), p. ej. “Laptop del trabajo”',
            add: 'Agregar una llave de acceso',
            cancelled: 'No se agregó ninguna llave de acceso: se cerró la ventana o se agotó el tiempo.',
            alreadyRegistered: 'Ese dispositivo o gestor de contraseñas ya tiene una llave de acceso para tu cuenta.',
            addFailed: 'No se pudo agregar la llave de acceso.'
        },
        twoFactor: {
            title: 'Verificación en dos pasos',
            description: 'Pide también un código cuando inicies sesión.',
            requiredDescription: 'Tu cuenta requiere también un código cuando inicias sesión.',
            onWithApp: 'Activada: inicias sesión con un código de tu app de autenticación.',
            onWithEmail: 'Activada: te enviamos un código por correo cuando inicias sesión.',
            needsPassword: 'Primero crea una contraseña para activar la verificación en dos pasos.',
            scan: 'Escanea esto con tu app de autenticación (Google Authenticator, 1Password, Authy, …) y escribe el código de 6 dígitos que te muestre.',
            cantScan: '¿No puedes escanearlo? Escribe esta clave:',
            saveCodes: 'Guarda tus códigos de respaldo',
            saveCodesDescription:
                'Cada uno te permite iniciar sesión una vez si pierdes tu app de autenticación. No se volverán a mostrar.',
            copy: 'Copiar',
            download: 'Descargar',
            saved: 'Ya los guardé',
            yourPassword: 'Tu contraseña',
            oldCodesStop: 'Tus códigos de respaldo actuales dejarán de funcionar.',
            useApp: 'Usar una app de autenticación',
            newCodes: 'Nuevos códigos de respaldo',
            turnOff: 'Desactivar',
            turnOn: 'Activar',
            makeCodes: 'Generar códigos nuevos',
            emailCodes: 'Enviarme códigos por correo',
            setUpApp: 'Configurar una app de autenticación',
            onToast: 'La verificación en dos pasos está activada',
            onByEmail: 'Te enviaremos un código por correo cuando inicies sesión.',
            offToast: 'La verificación en dos pasos está desactivada',
            appSetUp: 'App de autenticación configurada',
            codesCopied: 'Códigos de respaldo copiados'
        },
        methods: {
            title: 'Métodos de inicio de sesión',
            description: 'Las formas en que puedes iniciar sesión en tu cuenta.',
            password: 'Correo y contraseña',
            connectFailed: 'No se pudo conectar',
            disconnectFailed: 'No se pudo desconectar',
            disconnected: '{provider} desconectado',
            connectedOn: 'Conectado el',
            disconnect: 'Desconectar',
            onlyOne: 'Tu único método de inicio de sesión',
            connect: 'Conectar'
        },
        devices: {
            title: 'Dispositivos',
            description: 'Dónde tienes la sesión iniciada.',
            signOutFailed: 'No se pudo cerrar esa sesión',
            signedOutOf: 'Se cerró la sesión en {device}',
            signOutOthersFailed: 'No se pudieron cerrar esas sesiones',
            othersSignedOut: 'Se cerró la sesión en tus otros dispositivos',
            signOutOthers: 'Cerrar sesión en todos los demás dispositivos',
            thisDevice: 'Este dispositivo',
            unknownIp: 'IP desconocida',
            active: 'activo',
            signedInOn: 'inició sesión el',
            signOut: 'Cerrar sesión'
        },
        delete: {
            title: 'Eliminar cuenta',
            description: 'Elimina para siempre tu cuenta y todo lo que contiene. No se puede deshacer.',
            emailSent:
                'Abre el enlace que enviamos a {email} para confirmar. Tu cuenta se mantiene hasta que lo hagas.',
            button: 'Eliminar mi cuenta',
            confirmTitle: '¿Eliminar tu cuenta?',
            cantUndo: 'No se puede deshacer.',
            byEmail: 'Te enviaremos un enlace por correo para confirmar.',
            straightAway: 'Tu cuenta y todo lo que contiene se eliminarán de inmediato.',
            signInAgain: 'Por tu seguridad, cierra sesión y vuelve a iniciarla, y luego inténtalo de nuevo.',
            emailLink: 'Envíame un enlace'
        },
        data: {
            title: 'Tus datos',
            description:
                'Descarga lo que guardamos de tu cuenta: tu perfil, métodos de inicio de sesión, dispositivos, llaves de acceso e historial. Sin contraseñas ni claves.',
            button: 'Descargar mis datos'
        }
    },
    oauth: {
        email_not_found:
            'El proveedor no compartió un correo. Haz visible uno (p. ej. en GitHub, un correo público o verificado) y vuelve a intentarlo.',
        account_not_linked:
            'Esa cuenta usa un correo que ya tiene una cuenta aquí. Inicia sesión de otra forma y luego conéctala desde tu cuenta.',
        account_already_linked_to_different_user:
            'Esa cuenta del proveedor ya está conectada a la cuenta de otra persona.',
        "email_doesn't_match": 'El correo de esa cuenta del proveedor no coincide con el tuyo.',
        unable_to_link_account: 'No se pudo conectar esa cuenta. Vuelve a intentarlo.',
        signup_disabled: 'No se pueden crear cuentas nuevas con ese proveedor.',
        email_not_verified: 'Primero verifica tu correo: te enviamos un enlace.',
        access_denied: 'Se canceló el inicio de sesión.',
        INVALID_TOKEN: 'Ese enlace para iniciar sesión caducó o ya se usó. Pide uno nuevo.',
        EXPIRED_TOKEN: 'Ese enlace para iniciar sesión caducó. Pide uno nuevo.',
        new_user_signup_disabled: 'Ese correo no tiene cuenta, y los enlaces no pueden crear cuentas nuevas.',
        failed_to_create_user: 'No se pudo crear tu cuenta. Vuelve a intentarlo.',
        unknown: 'No se pudo iniciar tu sesión ({code}). Vuelve a intentarlo.'
    },
    errors: {
        generic: 'Algo salió mal. Inténtalo de nuevo.',
        INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
        INVALID_USERNAME_OR_PASSWORD: 'Nombre de usuario o contraseña incorrectos.',
        INVALID_PASSWORD: 'Contraseña incorrecta.',
        INVALID_EMAIL: 'Ese correo no es válido.',
        USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo.',
        USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con ese correo. Usa otro.',
        PASSWORD_TOO_SHORT: 'Esa contraseña es demasiado corta.',
        PASSWORD_TOO_LONG: 'Esa contraseña es demasiado larga.',
        PASSWORD_COMPROMISED: 'Esa contraseña apareció en una filtración de datos, así que no es segura. Elige otra.',
        EMAIL_NOT_VERIFIED: 'Primero verifica tu correo.',
        SESSION_EXPIRED: 'Por tu seguridad, vuelve a iniciar sesión e inténtalo otra vez.',
        INVALID_TOKEN: 'Ese enlace caducó o ya se usó.',
        FAILED_TO_UNLINK_LAST_ACCOUNT: 'No puedes quitar tu único método de inicio de sesión.',
        SOCIAL_ACCOUNT_ALREADY_LINKED: 'Esa cuenta ya está conectada.',
        USERNAME_IS_ALREADY_TAKEN: 'Ese nombre de usuario ya está en uso. Prueba otro.',
        USERNAME_TOO_SHORT: 'Ese nombre de usuario es demasiado corto.',
        USERNAME_TOO_LONG: 'Ese nombre de usuario es demasiado largo.',
        INVALID_USERNAME: 'El nombre de usuario solo puede tener letras, números, _ y .',
        USERNAME_IS_IMMUTABLE: 'Tu nombre de usuario no se puede cambiar.',
        INVALID_CODE: 'Ese código no es correcto.',
        INVALID_BACKUP_CODE: 'Ese código de respaldo no es correcto o ya se usó.',
        OTP_HAS_EXPIRED: 'Ese código caducó. Pide uno nuevo.',
        TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Demasiados intentos. Pide un código nuevo.',
        INVALID_OTP: 'Ese código no es correcto.',
        OTP_EXPIRED: 'Ese código caducó. Pide uno nuevo.',
        TOO_MANY_ATTEMPTS: 'Demasiados intentos. Pide un código nuevo.',
        // Las de Phone Number.
        INVALID_PHONE_NUMBER: 'Ese número de teléfono no es válido. Incluye el prefijo del país, p. ej. +34.',
        PHONE_NUMBER_EXIST: 'Otra cuenta ya usa ese número de teléfono.',
        OTP_NOT_FOUND: 'Ese código caducó. Pide uno nuevo.',
        PHONE_NUMBER_NOT_VERIFIED: 'Verifica primero tu número: te enviamos un código por SMS.',
        // Las de Anonymous.
        ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY: 'Ya estás usando una cuenta de invitado.',
        DELETE_ANONYMOUS_USER_DISABLED: 'Las cuentas de invitado no se pueden borrar aquí.',
        ACCOUNT_TEMPORARILY_LOCKED:
            'Demasiados códigos incorrectos. Tu cuenta está bloqueada por un rato; inténtalo más tarde.',
        MISSING_RESPONSE: 'Completa la verificación para demostrar que no eres un bot.',
        VERIFICATION_FAILED: 'La verificación anti-bots no pasó. Vuelve a intentarlo.'
    }
};
