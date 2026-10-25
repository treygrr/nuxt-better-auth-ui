/** The admin dashboard's words, in Spanish: the same keys as admin.en.ts. */
export const adminEs = {
    common: {
        guest: 'Invitado',
        cancel: 'Cancelar',
        save: 'Guardar',
        remove: 'Quitar',
        delete: 'Eliminar',
        edit: 'Editar',
        ban: 'Suspender',
        unban: 'Quitar suspensión',
        signOut: 'Cerrar sesión',
        password: 'Contraseña',
        changeRole: 'Cambiar rol',
        name: 'Nombre',
        email: 'Correo',
        role: 'Rol',
        user: 'Usuario',
        actions: 'Acciones',
        verified: 'Verificado',
        unverified: 'Sin verificar',
        banned: 'Suspendido',
        active: 'Activo',
        you: 'Tú',
        impersonated: 'Suplantada',
        unknownIp: 'IP desconocida',
        joined: 'Registro',
        lastActive: 'Última actividad',
        lastSignIn: 'Último inicio de sesión',
        never: 'Nunca',
        notInLastDays: 'Ninguno en los últimos {days} días',
        copied: 'Copiado al portapapeles',
        somethingWentWrong: 'Algo salió mal',
        twoFactorOn: 'Verificación en dos pasos activada',
        twoFactorOff: 'Verificación en dos pasos desactivada',
        resendVerification: 'Reenviar correo de verificación',
        verificationSent: 'Correo de verificación enviado a {email}',
        signOutEverywhere: 'Cerrar sesión en todos lados',
        signedOutEverywhere: 'Se cerró la sesión de {name} en todos lados',
        unbanned: 'Se quitó la suspensión de {name}',
        sessionSignedOut: 'Sesión cerrada',
        requestFailed: 'La solicitud falló'
    },
    validation: {
        required: 'Obligatorio',
        invalidEmail: 'Correo no válido',
        passwordLength: 'Al menos 8 caracteres',
        url: 'Debe ser una URL'
    },
    nav: {
        home: 'Inicio',
        users: 'Usuarios',
        organizations: 'Organizaciones',
        sessions: 'Sesiones',
        auditLog: 'Registro de auditoría',
        configuration: 'Configuración',
        backToSite: 'Volver al sitio'
    },
    organizations: {
        title: 'Organizaciones',
        intro: 'Todas las organizaciones, de la más reciente a la más antigua. Sus miembros las gestionan desde su cuenta.',
        search: 'Buscar por nombre…',
        loadFailed: 'No se pudieron cargar las organizaciones',
        empty: 'Aún no hay organizaciones.',
        back: 'Volver a organizaciones',
        columns: {
            name: 'Organización',
            members: 'Miembros',
            created: 'Creada'
        },
        count: {
            one: '{count} organización',
            other: '{count} organizaciones'
        },
        created: 'Creada',
        members: 'Miembros ({count})',
        readOnly: 'Solo lectura aquí: los miembros con el rol adecuado los cambian desde su cuenta.',
        invitations: 'Invitaciones pendientes',
        noInvitations: 'No hay invitaciones pendientes.',
        invitedBy: 'Invitado por {name}',
        expires: 'caduca',
        userDescription: 'Las organizaciones a las que pertenece {name} y su rol en cada una.',
        noneForUser: 'No pertenece a ninguna organización.',
        joined: 'Se unió'
    },
    search: {
        placeholder: 'Busca páginas y usuarios…',
        goTo: 'Ir a',
        actions: 'Acciones',
        createUser: 'Crear un usuario',
        yourAccount: 'Tu cuenta',
        users: 'Usuarios'
    },
    brand: {
        admin: 'Administración'
    },
    userMenu: {
        yourAccount: 'Tu cuenta',
        appearance: 'Apariencia',
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema',
        backToSite: 'Volver al sitio',
        logOut: 'Cerrar sesión'
    },
    impersonation: {
        signedInAs: 'Iniciaste sesión como',
        stop: 'Volver a tu cuenta',
        stopFailed: 'No se pudo volver a tu cuenta',
        signInAs: 'Iniciar sesión como {name}',
        signInAsUnavailable: 'Iniciar sesión como {name} ({reason})',
        reasons: {
            you: 'eres tú',
            admin: 'es admin',
            banned: 'está suspendido'
        },
        failed: 'No se pudo iniciar sesión como esa persona'
    },
    device: {
        unknown: 'Dispositivo desconocido',
        browser: 'Navegador',
        on: '{browser} en {os}'
    },
    audit: {
        title: 'Registro de auditoría',
        kept: 'Se guarda {days} días.',
        keptForever: 'Se guarda para siempre.',
        intro: 'Acciones de los administradores, e inicios de sesión y cambios de los usuarios en sus cuentas, primero lo más reciente.',
        entriesFor: 'Entradas de',
        oneUser: 'un usuario',
        showEveryone: 'Ver a todos',
        allActions: 'Todas las acciones',
        action: 'Acción',
        loadFailed: 'No se pudo cargar el registro de auditoría',
        entries: {
            one: '{count} entrada',
            other: '{count} entradas'
        },
        columns: {
            when: 'Cuándo',
            by: 'Quién',
            action: 'Acción',
            user: 'Usuario',
            details: 'Detalles'
        },
        empty: 'Aún no hay nada registrado.',
        actions: {
            userCreate: 'Creó un usuario',
            userUpdate: 'Editó un usuario',
            userSetRole: 'Cambió el rol',
            userBan: 'Suspendió',
            userUnban: 'Quitó la suspensión',
            userSetPassword: 'Estableció la contraseña',
            userSendVerification: 'Envió el correo de verificación',
            userDelete: 'Eliminó un usuario',
            sessionRevoke: 'Cerró una sesión',
            sessionRevokeAll: 'Cerró sesión en todos lados',
            userImpersonate: 'Inició sesión como el usuario',
            userStopImpersonating: 'Dejó de suplantar',
            accountRemove: 'Quitó un método de inicio de sesión',
            userTwoFactorReset: 'Restableció la verificación en dos pasos',
            userPasskeyRemove: 'Quitó una llave de acceso',
            userNoteAdd: 'Añadió una nota',
            userNoteDelete: 'Borró una nota',
            authSignUp: 'Se registró',
            authSignIn: 'Inició sesión',
            authSignInFailed: 'Inicio de sesión fallido',
            authSignOut: 'Cerró sesión',
            authEmailVerified: 'Verificó su correo',
            authPasswordResetRequested: 'Pidió restablecer la contraseña',
            authPasswordChanged: 'Cambió la contraseña',
            authDeviceApproved: 'Aprobó un dispositivo',
            authApiKeyCreated: 'Creó una clave de API',
            authApiKeyDeleted: 'Borró una clave de API',
            userApiKeyRevoke: 'Revocó una clave de API'
        },
        details: {
            role: 'Rol: {role}',
            changed: 'Cambió {fields}',
            fields: {
                name: 'nombre',
                email: 'correo',
                image: 'avatar',
                emailVerified: 'verificación'
            },
            reason: 'Motivo: {reason}',
            noReason: 'Sin motivo',
            for: 'por {duration}',
            permanently: 'de forma permanente',
            with: 'Con {method}',
            days: {
                one: '{count} día',
                other: '{count} días'
            },
            hours: {
                one: '{count} hora',
                other: '{count} horas'
            },
            seconds: '{count} segundos'
        }
    },
    home: {
        title: 'Inicio',
        newUser: 'Nuevo usuario',
        stats: {
            users: 'Usuarios',
            signUps: 'Registros',
            onlineNow: 'En línea ahora',
            activeSessions: 'Sesiones activas',
            banned: 'Suspendidos'
        },
        signUps: 'Registros',
        ranges: {
            last7Days: 'Últimos 7 días',
            last14Days: 'Últimos 14 días',
            last30Days: 'Últimos 30 días',
            last3Months: 'Últimos 3 meses',
            last6Months: 'Últimos 6 meses',
            lastYear: 'Último año'
        },
        pickDate: 'Elige una fecha',
        periods: {
            daily: 'diario',
            weekly: 'semanal',
            monthly: 'mensual'
        },
        newUsers: 'Usuarios nuevos'
    },
    users: {
        title: 'Usuarios',
        filters: {
            all: 'Todos los usuarios',
            role: 'Rol: {role}',
            banned: 'Suspendidos',
            unverified: 'Sin verificar',
            noTwoFactor: 'Sin verificación en dos pasos',
            guests: 'Invitados'
        },
        guestAccount: 'Cuenta de invitado',
        searchByEmail: 'Buscar por correo…',
        searchByName: 'Buscar por nombre…',
        display: 'Columnas',
        loadFailed: 'No se pudieron cargar los usuarios',
        footer: '{selected} de {count} seleccionados en esta página · {total} usuarios',
        columns: {
            user: 'Usuario',
            role: 'Rol',
            status: 'Estado',
            email: 'Correo',
            signIn: 'Inicio de sesión',
            joined: 'Registro'
        },
        selectAll: 'Seleccionar todo',
        selectRow: 'Seleccionar fila',
        none: 'Ninguno',
        viewDetails: 'Ver detalles',
        copyId: 'Copiar ID de usuario'
    },
    user: {
        title: 'Usuario',
        users: 'Usuarios',
        actions: 'Acciones',
        loadFailed: 'No se pudo cargar este usuario',
        backToUsers: 'Volver a usuarios',
        banned: 'Suspendido',
        noReason: 'Sin motivo',
        until: 'hasta el',
        untilUnbanned: 'hasta que se quite la suspensión',
        emailVerified: 'Correo verificado',
        emailUnverified: 'Correo sin verificar',
        twoFactorRequired: 'Verificación en dos pasos obligatoria, sin configurar',
        details: {
            title: 'Detalles',
            userId: 'ID de usuario',
            phone: 'Teléfono',
            phoneVerified: 'Verificado',
            phoneUnverified: 'Sin verificar',
            lastUpdated: 'Última actualización',
            notSinceTracking: 'Ninguna desde que empezó el seguimiento'
        },
        signInMethods: {
            title: 'Métodos de inicio de sesión',
            description: 'Cómo inicia sesión {name}.',
            none: 'No tiene métodos de inicio de sesión. No podrá entrar hasta que restablezca su contraseña.',
            connected: 'Conectado',
            accountId: 'ID de {provider}: {id}',
            menu: 'Acciones de {provider}',
            copyId: 'Copiar ID de la cuenta',
            removeOnly: 'Quitar (es su único método de inicio de sesión)'
        },
        sessions: {
            title: 'Sesiones',
            description: 'Dónde tiene la sesión iniciada {name}.',
            none: 'No hay sesiones activas.',
            thisSession: 'Esta sesión',
            active: 'activa',
            expires: 'vence'
        },
        activity: {
            title: 'Actividad',
            description: 'Inicios de sesión y cambios en la cuenta de {name}, y quién los hizo.',
            all: 'Las {count} entradas'
        }
    },
    sessions: {
        title: 'Sesiones',
        intro: 'Todas las personas con la sesión iniciada ahora mismo, primero las de actividad más reciente. "Última actividad" es cuando Better Auth renovó la sesión por última vez, así que puede tener hasta un día.',
        loadFailed: 'No se pudieron cargar las sesiones',
        secondaryStorage:
            'Las sesiones se guardan en un almacenamiento secundario (p. ej., Redis), no en la base de datos, así que no se pueden listar aquí.',
        empty: 'Nadie tiene la sesión iniciada.',
        count: {
            one: '{count} sesión',
            other: '{count} sesiones'
        },
        columns: {
            user: 'Usuario',
            device: 'Dispositivo',
            signedIn: 'Inicio de sesión',
            expires: 'Vence'
        },
        deletedUser: 'Usuario eliminado',
        signOutFailed: 'No se pudo cerrar la sesión'
    },
    modals: {
        ban: {
            titleOne: 'Suspender a {name}',
            titleMany: 'Suspender a {count} usuarios',
            description: 'Se cerrarán todas sus sesiones y no podrán iniciar sesión hasta que termine la suspensión.',
            reason: 'Motivo',
            reasonHelp: 'Opcional. Lo verán cuando intenten iniciar sesión.',
            duration: 'Duración',
            durations: {
                untilUnbanned: 'Hasta quitar la suspensión',
                oneHour: '1 hora',
                oneDay: '1 día',
                sevenDays: '7 días',
                thirtyDays: '30 días'
            },
            failed: 'No se pudo suspender a {failed} de {total}',
            bannedOne: 'Usuario suspendido',
            bannedMany: '{count} usuarios suspendidos'
        },
        create: {
            title: 'Agregar usuario',
            description: 'Crea una cuenta. Podrá iniciar sesión de inmediato.',
            passwordHelp: 'Opcional. Al menos 8 caracteres.',
            create: 'Crear',
            created: 'Usuario creado',
            open: 'Abrir',
            failed: 'No se pudo crear el usuario'
        },
        delete: {
            titleOne: 'Eliminar a {name}',
            titleMany: 'Eliminar a {count} usuarios',
            description:
                'Se eliminarán su cuenta, sus sesiones y sus métodos de inicio de sesión. No se puede deshacer.',
            failed: 'No se pudo eliminar a {failed} de {total}',
            deletedOne: 'Usuario eliminado',
            deletedMany: '{count} usuarios eliminados'
        },
        edit: {
            title: 'Editar usuario',
            avatarUrl: 'URL del avatar',
            optional: 'Opcional.',
            emailVerified: 'Correo verificado',
            updated: 'Usuario actualizado',
            failed: 'No se pudo actualizar el usuario'
        },
        password: {
            emailLink: 'Envíale un enlace para que elija una nueva contraseña.',
            sendReset: 'Enviar enlace de restablecimiento',
            or: 'o',
            setNew: 'Establecer una nueva contraseña',
            help: 'Al menos 8 caracteres.',
            setPassword: 'Establecer contraseña',
            set: 'Contraseña establecida',
            tellThem: 'Dile a {name} su nueva contraseña.',
            setFailed: 'No se pudo establecer la contraseña',
            resetSent: 'Enlace de restablecimiento enviado',
            resetFailed: 'No se pudo enviar el enlace de restablecimiento'
        },
        removeAccount: {
            title: '¿Quitar {provider}?',
            credential:
                'La contraseña de {name} dejará de funcionar. Aún podrá iniciar sesión de otra forma, o elegir una nueva contraseña con "¿Olvidaste tu contraseña?".',
            other: '{name} no podrá iniciar sesión con {provider} hasta que lo vuelva a conectar.',
            removed: 'Se quitó {provider}',
            failed: 'No se pudo quitar {provider}'
        },
        role: {
            help: '{role} puede hacer todo aquí; los demás roles, solo lo que tengan permitido.',
            changed: 'Rol cambiado',
            now: '{name} ahora es {role}',
            failed: 'No se pudo cambiar el rol'
        }
    },
    security: {
        title: 'Seguridad',
        description:
            'Verificación en dos pasos y llaves de acceso. Si {name} perdió un dispositivo, desactiva la verificación en dos pasos o quita la llave de acceso.',
        twoFactor: 'Verificación en dos pasos',
        on: 'Activada: se pide un código después de iniciar sesión.',
        offRequired: 'Desactivada, aunque su rol la exige: se le pedirá que la configure.',
        off: 'Desactivada.',
        turnOff: 'Desactivar',
        noPasskeys: 'No tiene llaves de acceso.',
        passkey: 'Llave de acceso',
        synced: 'Sincronizada',
        oneDevice: 'En un dispositivo',
        added: 'agregada el',
        resetTitle: '¿Desactivar la verificación en dos pasos?',
        resetDescription:
            '{name} iniciará sesión solo con su contraseña hasta que la vuelva a configurar. Su app de autenticación, sus códigos de respaldo y sus dispositivos de confianza dejarán de funcionar.',
        turnOffTwoFactor: 'Desactivar verificación en dos pasos',
        turnedOff: 'Verificación en dos pasos desactivada',
        askedAgain: 'Se le pedirá a {name} que la vuelva a configurar.',
        canSetUpAgain: '{name} puede volver a configurarla desde su cuenta.',
        resetFailed: 'No se pudo restablecer la verificación en dos pasos',
        removeTitle: '¿Quitar esta llave de acceso?',
        removeDescription: '{name} ya no podrá iniciar sesión con “{passkey}”.',
        removePasskey: 'Quitar llave de acceso',
        removed: 'Se quitó {passkey}',
        thePasskey: 'la llave de acceso',
        removeFailed: 'No se pudo quitar la llave de acceso'
    },
    subscription: {
        title: 'Suscripción',
        description:
            'El plan de {name}, desde Stripe. Los cambios se hacen en el panel de Stripe o en su pestaña de facturación.',
        none: 'Sin suscripción.',
        renews: 'Se renueva',
        ends: 'Termina'
    },
    fields: {
        title: 'Más datos',
        description: 'Los campos propios de tu aplicación.',
        edit: 'Editar datos',
        editTitle: 'Editar los datos de {name}',
        yes: 'Sí',
        no: 'No',
        commaSeparated: 'Separa los valores con comas.',
        saved: 'Datos guardados',
        failed: 'No se pudieron guardar los datos'
    },
    apiKeys: {
        title: 'Claves de API',
        description: 'Las claves de {name} para scripts e integraciones. Revoca una que se haya filtrado.',
        none: 'No tiene claves de API.',
        unnamed: 'Clave sin nombre',
        lastUsed: 'Último uso',
        neverUsed: 'Nunca usada',
        expires: 'caduca',
        noExpiry: 'no caduca',
        revokeTitle: '¿Revocar esta clave?',
        revokeDescription: 'Todo lo que use “{key}” deja de funcionar al momento.',
        revoke: 'Revocar clave',
        revoked: 'Se revocó {key}',
        revokeFailed: 'No se pudo revocar la clave'
    },
    notes: {
        title: 'Notas',
        description: 'Solo para el equipo: {name} nunca las ve.',
        placeholder: 'Añade una nota, p. ej. "Advertido por spam en el chat"',
        add: 'Añadir nota',
        added: 'Nota añadida',
        addFailed: 'No se pudo añadir la nota',
        none: 'Aún no hay notas.',
        deleteTitle: '¿Borrar esta nota?',
        deleteDescription: 'El registro de auditoría guarda que se borró, no lo que decía.',
        deleteNote: 'Borrar nota',
        deleted: 'Nota borrada',
        deleteFailed: 'No se pudo borrar la nota',
        by: 'por {name}'
    },
    configuration: {
        title: 'Configuración',
        introBefore: 'Cómo está configurada {app}, según su configuración de Better Auth y las opciones',
        introAfter: 'de nuxt.config. Solo lectura: cámbialas en el código.',
        theApp: 'la app',
        // "Sí"/"No" agree with every setting, whatever its gender.
        on: 'Sí',
        off: 'No',
        sections: {
            signIn: 'Inicio de sesión',
            security: 'Seguridad',
            selfService: 'Autoservicio',
            emails: 'Correos',
            records: 'Registros de administración'
        },
        rows: {
            emailAndPassword: 'Correo y contraseña',
            signUps: 'Registros',
            open: 'Abiertos',
            closed: 'Cerrados',
            emailVerification: 'Verificación del correo',
            requiredToSignIn: 'Obligatoria para iniciar sesión',
            sentNotRequired: 'Se envía, no es obligatoria',
            passwords: 'Contraseñas',
            characters: '{min}–{max} caracteres',
            canReset: 'Se pueden restablecer por correo',
            cantReset: 'No se pueden restablecer por correo',
            socialProviders: 'Proveedores sociales',
            none: 'Ninguno',
            passkeys: 'Llaves de acceso',
            magicLinks: 'Enlaces mágicos',
            emailCodes: 'Códigos por correo',
            digits: '{count} dígitos',
            phoneCodes: 'Códigos por SMS',
            phoneSignUp: 'Un número nuevo crea una cuenta',
            guestAccounts: 'Cuentas de invitado',
            deviceSignIn: 'Inicio de sesión en dispositivos',
            apiKeys: 'Claves de API',
            organizations: 'Organizaciones',
            organizationsNoCreate: 'Los usuarios no pueden crearlas',
            stripe: 'Suscripciones (Stripe)',
            bearerTokens: 'Tokens Bearer',
            oauthPopup: 'Inicio de sesión con proveedores en una ventana emergente',
            jwt: 'JWT para otros servicios',
            jwksAt: 'Claves públicas (JWKS): {url}',
            usernames: 'Nombres de usuario',
            usernameImmutable: 'No se pueden cambiar una vez elegidos',
            lastUsed: 'Último método usado',
            lastUsedHint: 'Una cookie recuerda cómo iniciaron sesión la última vez',
            twoFactor: 'Verificación en dos pasos',
            authenticatorOrEmail: 'App de autenticación o códigos por correo',
            authenticator: 'App de autenticación',
            requiredFor: 'Obligatoria para',
            everyone: 'Todos',
            nobody: 'Nadie (opcional)',
            requiredHint: 'Los inicios de sesión con llave de acceso cuentan; los de contraseña necesitan un código',
            withoutPassword: 'Sin contraseña',
            canTurnOn: 'Se puede activar',
            cantTurnOn: 'No se puede activar',
            breachedPasswords: 'Contraseñas filtradas',
            refused: 'Rechazadas (Have I Been Pwned)',
            allowed: 'Permitidas',
            securityAlerts: 'Alertas de seguridad',
            securityAlertsHint: 'Se envían por correo al titular de la cuenta',
            alerts: {
                newSignIn: 'dispositivos nuevos',
                passwordChanged: 'cambios de contraseña',
                twoFactor: 'dos pasos',
                passkeyAdded: 'llaves de acceso nuevas'
            },
            captcha: 'Captcha',
            onSignUp: 'Al registrarse',
            impersonation: 'Suplantación',
            impersonationOn: 'Los admins pueden iniciar sesión como usuarios',
            changingEmail: 'Cambiar el correo',
            changeEmailApproved: 'Sí, se aprueba desde la dirección actual',
            deletingAccount: 'Eliminar su cuenta',
            deleteByEmail: 'Sí, se confirma por correo',
            delivery: 'Envío',
            yourSender: 'Tu remitente',
            notSetUp: 'Sin configurar',
            yourTemplate: 'Tu plantilla',
            plainDefault: 'Texto plano predeterminado',
            auditLog: 'Registro de auditoría',
            keptDays: 'Se guarda {days} días',
            keptForever: 'Se guarda para siempre',
            signInsInLog: 'Inicios de sesión de usuarios en el registro',
            activityTracking: 'Seguimiento de actividad',
            every: {
                one: 'Cada {count} minuto',
                other: 'Cada {count} minutos'
            },
            activityHint: '"Última actividad" y "en línea ahora"',
            userNotes: 'Notas del equipo sobre usuarios',
            adminPages: 'Páginas de administración'
        },
        emails: {
            verifyEmail: 'Verificar el correo',
            resetPassword: 'Restablecer la contraseña',
            existingUserSignUp: 'Registro con un correo ya usado',
            changeEmailConfirmation: 'Aprobar un cambio de correo',
            deleteAccount: 'Confirmar la eliminación de una cuenta',
            twoFactorCode: 'Código de verificación en dos pasos',
            magicLink: 'Enlace de inicio de sesión',
            emailCode: 'Código por correo',
            newSignIn: 'Alerta: nuevo inicio de sesión',
            passwordChanged: 'Alerta: contraseña cambiada',
            twoFactorChanged: 'Alerta: dos pasos activada o desactivada',
            passkeyAdded: 'Alerta: llave de acceso agregada',
            organizationInvitation: 'Invitación a una organización'
        },
        roles: {
            title: 'Roles y permisos',
            descriptionBefore:
                'Lo que puede hacer cada rol en las páginas de administración y en los endpoints de administración de Better Auth. Los roles con',
            descriptionAfter: 'pueden abrir estas páginas.',
            staff: 'Equipo',
            permission: 'Permiso',
            allowed: 'Permitido',
            notAllowed: 'No permitido'
        },
        permissions: {
            user: {
                list: 'Ver la lista de usuarios',
                get: 'Ver un usuario',
                create: 'Crear usuarios',
                update: 'Editar nombres y datos',
                setEmail: 'Cambiar correos',
                setPassword: 'Establecer contraseñas',
                setRole: 'Cambiar roles',
                ban: 'Suspender y quitar suspensiones',
                impersonate: 'Iniciar sesión como un usuario',
                impersonateAdmins: 'Iniciar sesión como un admin',
                delete: 'Eliminar usuarios'
            },
            session: {
                list: 'Ver sesiones',
                revoke: 'Cerrar sesiones',
                delete: 'Eliminar sesiones'
            }
        }
    }
};
