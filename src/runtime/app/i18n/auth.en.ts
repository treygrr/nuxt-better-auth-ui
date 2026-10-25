/** The sign-in, account and two-factor pages' words, in English. Spanish is in auth.es.ts, with the same keys. */
export const authEn = {
    common: {
        email: 'Email',
        password: 'Password',
        name: 'Name',
        username: 'Username',
        back: 'Back',
        backToSignIn: 'Back to sign in',
        verify: 'Verify',
        save: 'Save',
        cancel: 'Cancel',
        continue: 'Continue',
        on: 'On',
        off: 'Off'
    },
    password: {
        minimum: 'At least {min} characters.',
        breachChecked: "We'll check it against known data breaches."
    },
    captcha: {
        required: "Complete the check above to show you're not a bot."
    },
    signIn: {
        title: 'Sign in',
        emailOrUsername: 'Email or username',
        submit: 'Sign in',
        noAccount: 'No account yet?',
        signUp: 'Sign up',
        forgotPassword: 'Forgot password?',
        passkey: 'Sign in with a passkey',
        continueWith: 'Continue with {provider}',
        lastUsed: 'Last time, you signed in with {method}.',
        methods: {
            password: 'your password',
            passkey: 'a passkey',
            magicLink: 'a sign-in link',
            emailCode: 'a code by email',
            phone: 'a code by text'
        },
        phone: {
            button: 'Text me a code',
            title: 'Sign in with your phone',
            description: "We'll text you a code to type in here.",
            label: 'Phone number',
            placeholder: '+1 555 123 4567',
            submit: 'Send code',
            failed: "Couldn't send the code",
            enterDescription: 'We texted a code to {phone}. It expires in a few minutes.',
            noAccount: 'No account has that phone number. Sign in another way, then add it from your account.'
        },
        verifyFirst: {
            title: 'Verify your email first',
            description: "We've sent you a new verification link. Open it, then sign in."
        },
        failed: "Couldn't sign in",
        magicLink: {
            button: 'Email me a sign-in link',
            title: 'Sign in with a link',
            description: "We'll email you a link that signs you in. No password needed.",
            submit: 'Send link',
            failed: "Couldn't send the link",
            usePassword: 'Use your password instead',
            sentTitle: 'Check your email',
            sentDescription: "We've sent a sign-in link to {email}. It works once and expires in a few minutes."
        },
        emailCode: {
            button: 'Email me a code',
            title: 'Sign in with a code',
            description: "We'll email you a code to type in here. Handy on a device that doesn't have your email.",
            submit: 'Send code',
            failed: "Couldn't send the code",
            enterTitle: 'Enter your code',
            enterDescription: 'We sent a code to {email}. It expires in a few minutes.',
            codeLabel: 'Code',
            wrongCode: "Couldn't sign in with that code",
            resend: 'Send a new code',
            resent: 'New code sent'
        },
        guest: {
            button: 'Continue as a guest',
            failed: "Couldn't start a guest account",
            keepTitle: "You're using a guest account",
            keepDescription: 'Sign in or create an account to keep it, and everything you did as a guest.'
        }
    },
    signUp: {
        title: 'Create an account',
        usernameHelp: 'Letters, numbers, _ and . ({min}–{max} characters).',
        submit: 'Create account',
        haveAccount: 'Already have one?',
        signIn: 'Sign in',
        failed: "Couldn't create your account",
        checkEmail: {
            title: 'Check your email',
            description: "We've sent a link to {email}. Open it to verify your email and finish creating your account."
        },
        closed: {
            title: 'Sign-ups are closed',
            description: "New accounts can't be created right now."
        }
    },
    forgotPassword: {
        title: 'Forgot your password?',
        description: "We'll email you a link to choose a new one.",
        submit: 'Send reset link',
        sentTitle: 'Check your email',
        sentDescription: "If {email} has an account, we've sent it a link to choose a new password.",
        remembered: 'Remembered it?',
        failed: "Couldn't send the link"
    },
    resetPassword: {
        title: 'Choose a new password',
        newPassword: 'New password',
        submit: 'Change password',
        doneTitle: 'Password changed',
        doneDescription: 'Sign in with your new password.',
        brokenTitle: "This link doesn't work",
        brokenDescription: 'It may have expired or been used already. Ask for a new one.',
        newLink: 'Send a new link',
        failed: "Couldn't change your password"
    },
    device: {
        title: 'Connect a device',
        description: 'Enter the code your device shows, to sign it in to your account.',
        codeLabel: 'Code',
        submit: 'Continue',
        reviewTitle: 'Sign in on this device?',
        reviewDescription: '{app} is asking to sign in to your account.',
        app: 'App',
        access: 'Access',
        fullAccess: 'Your account',
        code: 'Code',
        warning:
            'Only approve if you started this on a device you have with you, and its code matches. Never approve a code someone sent you.',
        approve: 'Approve',
        deny: 'Deny',
        anotherCode: 'Enter another code',
        approvedTitle: 'Device connected',
        approvedDescription: 'Go back to your device: it signs in within a few seconds.',
        deniedTitle: 'Request denied',
        deniedDescription: "That device won't be signed in.",
        errors: {
            invalid: "That code isn't right. Check it on your device.",
            expired: 'That code has expired. Get a new one on your device.',
            used: 'That code was already used. Get a new one on your device.',
            otherAccount: 'That code is being used by another account.',
            failed: "That didn't work. Try again."
        }
    },
    twoFactorPage: {
        title: 'Two-factor authentication',
        totp: {
            title: 'Enter your code',
            description: 'Open your authenticator app and enter the 6-digit code for this account.'
        },
        otp: {
            title: 'Check your email',
            description: 'We can email you a 6-digit code to finish signing in.',
            send: 'Email me a code'
        },
        backup: {
            title: 'Use a backup code',
            description: 'Enter one of the backup codes you saved when you set up two-factor. Each works once.',
            label: 'Backup code'
        },
        codeLabel: 'Code',
        trust: {
            label: 'Trust this device',
            description: "Don't ask for a code here again for a while."
        },
        expired: {
            title: 'This sign-in has expired',
            description: 'Sign in again to get a new code.'
        },
        failed: "That didn't work",
        useApp: 'Use your authenticator app',
        useEmail: 'Email me a code instead',
        useBackup: 'Use a backup code'
    },
    account: {
        title: 'Your account',
        signOut: 'Sign out',
        tabs: {
            profile: 'Profile',
            security: 'Security',
            devices: 'Devices',
            delete: 'Delete',
            apiKeys: 'API keys',
            actionNeeded: 'Action needed'
        },
        phone: {
            title: 'Phone number',
            description: 'For signing in with a code by text.',
            none: 'No phone number yet.',
            verified: 'Verified',
            unverified: 'Not verified',
            add: 'Add a phone number',
            change: 'Change',
            remove: 'Remove',
            label: 'Phone number',
            placeholder: '+1 555 123 4567',
            send: 'Text me a code',
            enterDescription: 'Enter the code we texted to {phone}.',
            codeLabel: 'Code',
            verify: 'Verify',
            saved: 'Phone number saved',
            removed: 'Phone number removed',
            failed: "That didn't work"
        },
        apiKeys: {
            title: 'API keys',
            description:
                'Keys let your scripts, bots and integrations use your account. Keep them secret, like a password.',
            none: 'No API keys yet.',
            unnamed: 'Unnamed key',
            create: 'Create key',
            createTitle: 'Create an API key',
            name: 'Name',
            namePlaceholder: 'eg Deploy script',
            expiry: 'Expires',
            days: 'In {count} days',
            never: 'Never',
            permissions: 'Permissions',
            permissionsHint: 'Give it only what it needs.',
            createdTitle: 'Copy your new key',
            createdDescription: "It won't be shown again. Keep it somewhere safe, like a password manager.",
            copy: 'Copy',
            copied: 'Copied',
            done: 'Done',
            createFailed: "Couldn't create the key",
            lastUsed: 'Last used',
            neverUsed: 'Never used',
            expires: 'expires',
            noExpiry: 'never expires',
            expired: 'Expired',
            revoke: 'Revoke',
            revokeTitle: 'Revoke this key?',
            revokeDescription: 'Anything using “{name}” stops working at once.',
            revoked: 'Key revoked',
            revokeFailed: "Couldn't revoke the key"
        },
        required: {
            title: 'Set up two-factor authentication',
            description: 'Your account requires it. Set it up under Security to keep using the site.',
            action: 'Set it up'
        },
        guest: {
            badge: 'Guest',
            title: "You're using a guest account",
            description:
                "Create an account or sign in to keep it, with everything you did as a guest. Once you sign out, you can't get back to a guest account.",
            signUp: 'Create an account',
            signIn: 'Sign in',
            delete: 'Delete guest account',
            deleteTitle: 'Delete this guest account?',
            deleteDescription: 'Everything you did as a guest is deleted, and you’re signed out.',
            deleteFailed: "Couldn't delete the guest account"
        },
        passkeySession: {
            title: 'Signed in with your passkey',
            description:
                "That's all you need. To sign in with your password too, set up two-factor: your account asks for a code after a password."
        },
        overview: {
            email: 'Email',
            verified: 'Verified',
            unverified: 'Unverified',
            twoFactor: 'Two-factor',
            required: 'Required',
            passkeys: 'Passkeys',
            noneYet: 'None yet',
            methods: 'Sign-in methods',
            devices: 'Devices',
            signedIn: '{count} signed in',
            memberSince: 'Member since'
        },
        profile: {
            title: 'Profile',
            description: 'How you appear to others.',
            avatar: 'Avatar URL',
            saved: 'Profile saved',
            failed: "Couldn't save your profile",
            usernameLocked: "Usernames can't be changed once set."
        },
        email: {
            notVerified: 'Not verified',
            verifyHint: 'Verify your email so you can recover your account.',
            resend: 'Send verification link',
            resent: 'Verification link sent',
            resendFailed: "Couldn't send the link",
            checkTitle: 'Check your email',
            approvalFirst:
                "We've sent a link to {current} to approve the change, then we'll ask {next} to confirm. Your address stays the same until then.",
            confirmNew:
                'Open the link we sent to {next} to finish changing your email. Your current address stays until then.',
            newEmail: 'New email',
            change: 'Change email'
        },
        password: {
            description: 'Change the password you sign in with.',
            connectedOnly: 'You sign in with a connected account.',
            current: 'Current password',
            changed: 'Password changed',
            othersSignedOut: 'Your other devices have been signed out.',
            signOutOthers: 'Sign out of my other devices',
            setLinkSent: "We've sent {email} a link to set a password.",
            addHint: 'Add a password to sign in with your email too.',
            sendSetLink: 'Email me a link to set one'
        },
        passkeys: {
            title: 'Passkeys',
            description: 'Sign in with your fingerprint, face, screen lock or a security key instead of a password.',
            unsupported: "This browser can't use passkeys",
            added: 'Passkey added',
            addedHint: 'You can sign in with it now.',
            renameFailed: "Couldn't rename it",
            removeFailed: "Couldn't remove it",
            removed: 'Removed {name}',
            defaultName: 'Passkey',
            nameLabel: 'Passkey name',
            synced: 'Synced',
            oneDevice: 'On one device',
            added_on: 'added',
            rename: 'Rename',
            remove: 'Remove',
            namePlaceholder: 'Name it (optional), eg “Work laptop”',
            add: 'Add a passkey',
            cancelled: 'No passkey was added: the prompt was closed or timed out.',
            alreadyRegistered: 'That device or password manager already has a passkey for your account.',
            addFailed: "Couldn't add the passkey."
        },
        twoFactor: {
            title: 'Two-factor authentication',
            description: 'Ask for a code as well when you sign in.',
            requiredDescription: 'Your account requires a code as well when you sign in.',
            onWithApp: 'On: you sign in with a code from your authenticator app.',
            onWithEmail: 'On: we email you a code when you sign in.',
            needsPassword: 'Set a password first to turn on two-factor.',
            scan: 'Scan this with your authenticator app (Google Authenticator, 1Password, Authy, …), then enter the 6-digit code it shows.',
            cantScan: "Can't scan it? Enter this key instead:",
            saveCodes: 'Save your backup codes',
            saveCodesDescription:
                "Each one signs you in once if you lose your authenticator app. They won't be shown again.",
            copy: 'Copy',
            download: 'Download',
            saved: "I've saved them",
            yourPassword: 'Your password',
            oldCodesStop: 'Your current backup codes will stop working.',
            useApp: 'Use an authenticator app',
            newCodes: 'New backup codes',
            turnOff: 'Turn off',
            turnOn: 'Turn on',
            makeCodes: 'Make new codes',
            emailCodes: 'Email me codes',
            setUpApp: 'Set up an authenticator app',
            onToast: 'Two-factor is on',
            onByEmail: "We'll email you a code when you sign in.",
            offToast: 'Two-factor is off',
            appSetUp: 'Authenticator app set up',
            codesCopied: 'Backup codes copied'
        },
        methods: {
            title: 'Sign-in methods',
            description: 'The ways you can sign in to your account.',
            password: 'Email and password',
            connectFailed: "Couldn't connect it",
            disconnectFailed: "Couldn't disconnect it",
            disconnected: '{provider} disconnected',
            connectedOn: 'Connected',
            disconnect: 'Disconnect',
            onlyOne: 'Your only sign-in method',
            connect: 'Connect'
        },
        devices: {
            title: 'Devices',
            description: "Where you're signed in.",
            signOutFailed: "Couldn't sign it out",
            signedOutOf: 'Signed out of {device}',
            signOutOthersFailed: "Couldn't sign them out",
            othersSignedOut: 'Signed out of your other devices',
            signOutOthers: 'Sign out of all other devices',
            thisDevice: 'This device',
            unknownIp: 'Unknown IP',
            active: 'active',
            signedInOn: 'signed in',
            signOut: 'Sign out'
        },
        delete: {
            title: 'Delete account',
            description: "Permanently delete your account and everything in it. This can't be undone.",
            emailSent: 'Open the link we sent to {email} to confirm. Your account stays until you do.',
            button: 'Delete my account',
            confirmTitle: 'Delete your account?',
            cantUndo: "This can't be undone.",
            byEmail: "We'll email you a link to confirm.",
            straightAway: 'Your account and everything in it will be deleted straight away.',
            signInAgain: 'For your security, sign out and back in, then try again.',
            emailLink: 'Email me a link'
        },
        data: {
            title: 'Your data',
            description:
                'Download what we keep about your account: your profile, sign-in methods, devices, passkeys and account history. Passwords and keys stay out.',
            button: 'Download my data'
        }
    },
    // Better Auth's error codes as it adds them to an error URL (?error=…), from provider sign-ins and sign-in links.
    oauth: {
        email_not_found:
            "The provider didn't share an email address. Make one visible (eg on GitHub, a public or verified email), then try again.",
        account_not_linked:
            'That account uses an email that already has an account here. Sign in another way, then connect it from your account page.',
        account_already_linked_to_different_user:
            "That provider account is already connected to someone else's account.",
        "email_doesn't_match": "That provider account's email doesn't match yours.",
        unable_to_link_account: "Couldn't connect that account. Try again.",
        signup_disabled: "New accounts can't be created with that provider.",
        email_not_verified: "Verify your email first: we've sent you a link.",
        access_denied: 'Sign-in was cancelled.',
        INVALID_TOKEN: 'That sign-in link has expired or was already used. Ask for a new one.',
        EXPIRED_TOKEN: 'That sign-in link has expired. Ask for a new one.',
        new_user_signup_disabled: "That email doesn't have an account, and links can't create new ones.",
        failed_to_create_user: "Couldn't create your account. Try again.",
        unknown: "Couldn't sign you in ({code}). Try again."
    },
    // Better Auth's error codes, in the visitor's words; codes not listed show Better Auth's own message.
    errors: {
        generic: 'Something went wrong. Try again.',
        INVALID_EMAIL_OR_PASSWORD: 'Wrong email or password.',
        INVALID_USERNAME_OR_PASSWORD: 'Wrong username or password.',
        INVALID_PASSWORD: 'Wrong password.',
        INVALID_EMAIL: "That email address isn't valid.",
        USER_ALREADY_EXISTS: 'An account with that email already exists.',
        USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'An account with that email already exists. Use another email.',
        PASSWORD_TOO_SHORT: 'That password is too short.',
        PASSWORD_TOO_LONG: 'That password is too long.',
        PASSWORD_COMPROMISED:
            'That password has appeared in a data breach, so it isn’t safe to use. Choose a different one.',
        EMAIL_NOT_VERIFIED: 'Verify your email first.',
        SESSION_EXPIRED: 'For your security, sign in again, then try once more.',
        INVALID_TOKEN: 'That link has expired or was already used.',
        FAILED_TO_UNLINK_LAST_ACCOUNT: "You can't remove your only sign-in method.",
        SOCIAL_ACCOUNT_ALREADY_LINKED: 'That account is already connected.',
        USERNAME_IS_ALREADY_TAKEN: 'That username is taken. Try another.',
        USERNAME_TOO_SHORT: 'That username is too short.',
        USERNAME_TOO_LONG: 'That username is too long.',
        INVALID_USERNAME: 'Usernames can use letters, numbers, _ and . only.',
        USERNAME_IS_IMMUTABLE: "Your username can't be changed.",
        INVALID_CODE: "That code isn't right.",
        INVALID_BACKUP_CODE: "That backup code isn't right, or was already used.",
        OTP_HAS_EXPIRED: 'That code has expired. Ask for a new one.',
        TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Too many tries. Ask for a new code.',
        // Email OTP's.
        INVALID_OTP: "That code isn't right.",
        OTP_EXPIRED: 'That code has expired. Ask for a new one.',
        TOO_MANY_ATTEMPTS: 'Too many tries. Ask for a new code.',
        // Phone Number's.
        INVALID_PHONE_NUMBER: "That phone number isn't valid. Include the country code, eg +1.",
        PHONE_NUMBER_EXIST: 'Another account already uses that phone number.',
        OTP_NOT_FOUND: 'That code has expired. Ask for a new one.',
        PHONE_NUMBER_NOT_VERIFIED: 'Verify your phone number first: we’ve texted you a code.',
        // Anonymous's.
        ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY: "You're already using a guest account.",
        DELETE_ANONYMOUS_USER_DISABLED: "Guest accounts can't be deleted here.",
        ACCOUNT_TEMPORARILY_LOCKED: 'Too many wrong codes. Your account is locked for a while; try again later.',
        MISSING_RESPONSE: "Complete the check to show you're not a bot.",
        VERIFICATION_FAILED: "The bot check didn't pass. Try it again."
    }
};
