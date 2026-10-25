/** The admin dashboard's words, in English. Spanish is in admin.es.ts, with the same keys. */
export const adminEn = {
    // Shared by several pages and modals.
    common: {
        guest: 'Guest',
        cancel: 'Cancel',
        save: 'Save',
        remove: 'Remove',
        delete: 'Delete',
        edit: 'Edit',
        ban: 'Ban',
        unban: 'Unban',
        signOut: 'Sign out',
        password: 'Password',
        changeRole: 'Change role',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        user: 'User',
        actions: 'Actions',
        verified: 'Verified',
        unverified: 'Unverified',
        banned: 'Banned',
        active: 'Active',
        you: 'You',
        impersonated: 'Impersonated',
        unknownIp: 'Unknown IP',
        joined: 'Joined',
        lastActive: 'Last active',
        lastSignIn: 'Last sign-in',
        never: 'Never',
        notInLastDays: 'Not in the last {days} days',
        copied: 'Copied to clipboard',
        somethingWentWrong: 'Something went wrong',
        twoFactorOn: 'Two-factor on',
        twoFactorOff: 'Two-factor off',
        resendVerification: 'Resend verification email',
        verificationSent: 'Verification email sent to {email}',
        signOutEverywhere: 'Sign out everywhere',
        signedOutEverywhere: '{name} was signed out everywhere',
        unbanned: '{name} was unbanned',
        sessionSignedOut: 'Session signed out',
        requestFailed: 'The request failed'
    },
    validation: {
        required: 'Required',
        invalidEmail: 'Invalid email',
        passwordLength: 'At least 8 characters',
        url: 'Must be a URL'
    },
    nav: {
        home: 'Home',
        users: 'Users',
        organizations: 'Organizations',
        sso: 'Single sign-on',
        sessions: 'Sessions',
        auditLog: 'Audit log',
        configuration: 'Configuration',
        backToSite: 'Back to site'
    },
    sso: {
        title: 'Single sign-on',
        intro: "Every identity provider (OIDC or SAML). Organizations' owners and admins manage theirs from the organization's page.",
        search: 'Search by provider, domain or organization…',
        loadFailed: "Couldn't load the identity providers",
        empty: 'No identity providers yet.',
        verified: 'Verified',
        unverified: 'Not verified',
        noOrganization: 'None',
        columns: {
            provider: 'Provider',
            domain: 'Domains',
            organization: 'Organization',
            registeredBy: 'Added by'
        }
    },
    organizations: {
        title: 'Organizations',
        intro: 'Every organization, newest first. Their members manage them from their account page.',
        search: 'Search by name…',
        loadFailed: "Couldn't load the organizations",
        empty: 'No organizations yet.',
        back: 'Back to organizations',
        columns: {
            name: 'Organization',
            members: 'Members',
            created: 'Created'
        },
        count: {
            one: '{count} organization',
            other: '{count} organizations'
        },
        created: 'Created',
        members: 'Members ({count})',
        readOnly: "Its members manage it from the organization's page; staff can add members here.",
        addEmail: "The user's email",
        addRoles: 'Roles',
        noTeam: 'No team',
        add: 'Add member',
        added: 'Added {email}',
        addFailed: "Couldn't add the member",
        teams: 'Teams',
        teamMembers: '{count} members',
        roles: "The organization's own roles",
        invitations: 'Pending invitations',
        noInvitations: 'No pending invitations.',
        invitedBy: 'Invited by {name}',
        expires: 'expires',
        userDescription: 'The organizations {name} belongs to, and their role in each.',
        noneForUser: 'Not in any organization.',
        joined: 'Joined'
    },
    search: {
        placeholder: 'Search pages and users…',
        goTo: 'Go to',
        actions: 'Actions',
        createUser: 'Create a user',
        yourAccount: 'Your account',
        users: 'Users'
    },
    brand: {
        admin: 'Admin'
    },
    userMenu: {
        yourAccount: 'Your account',
        appearance: 'Appearance',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        backToSite: 'Back to site',
        logOut: 'Log out'
    },
    impersonation: {
        signedInAs: "You're signed in as",
        stop: 'Stop impersonating',
        stopFailed: "Couldn't stop impersonating",
        signInAs: 'Sign in as {name}',
        signInAsUnavailable: 'Sign in as {name} ({reason})',
        reasons: {
            you: 'you',
            admin: 'an admin',
            banned: 'banned'
        },
        failed: "Couldn't sign in as them"
    },
    device: {
        unknown: 'Unknown device',
        browser: 'Browser',
        on: '{browser} on {os}'
    },
    audit: {
        title: 'Audit log',
        kept: 'Kept for {days} days.',
        keptForever: 'Kept forever.',
        intro: 'Admin actions, and users signing in and changing their accounts, newest first.',
        entriesFor: 'Entries for',
        oneUser: 'one user',
        showEveryone: 'Show everyone',
        allActions: 'All actions',
        action: 'Action',
        loadFailed: "Couldn't load the audit log",
        entries: {
            one: '{count} entry',
            other: '{count} entries'
        },
        columns: {
            when: 'When',
            by: 'By',
            action: 'Action',
            user: 'User',
            details: 'Details'
        },
        empty: 'Nothing recorded yet.',
        actions: {
            userCreate: 'Created user',
            userUpdate: 'Edited user',
            userSetRole: 'Changed role',
            userBan: 'Banned',
            userUnban: 'Unbanned',
            userSetPassword: 'Set password',
            userSendVerification: 'Sent verification email',
            userDelete: 'Deleted user',
            sessionRevoke: 'Signed out a session',
            sessionRevokeAll: 'Signed out everywhere',
            userImpersonate: 'Signed in as user',
            userStopImpersonating: 'Stopped impersonating',
            accountRemove: 'Removed sign-in method',
            userTwoFactorReset: 'Reset two-factor',
            userPasskeyRemove: 'Removed passkey',
            userNoteAdd: 'Added a note',
            organizationMemberAdd: 'Added to an organization',
            userNoteDelete: 'Deleted a note',
            usersExport: 'Exported users',
            authSignUp: 'Signed up',
            authSignIn: 'Signed in',
            authSignInFailed: 'Failed sign-in',
            authSignOut: 'Signed out',
            authEmailVerified: 'Verified email',
            authPasswordResetRequested: 'Asked to reset password',
            authPasswordChanged: 'Changed password',
            authDeviceApproved: 'Approved a device',
            authApiKeyCreated: 'Created an API key',
            authApiKeyDeleted: 'Deleted an API key',
            userApiKeyRevoke: 'Revoked an API key'
        },
        details: {
            role: 'Role: {role}',
            changed: 'Changed {fields}',
            fields: {
                name: 'name',
                email: 'email',
                image: 'avatar',
                emailVerified: 'verification'
            },
            reason: 'Reason: {reason}',
            noReason: 'No reason given',
            users: '{count} users',
            for: 'for {duration}',
            permanently: 'permanently',
            with: 'With {method}',
            days: {
                one: '{count} day',
                other: '{count} days'
            },
            hours: {
                one: '{count} hour',
                other: '{count} hours'
            },
            seconds: '{count} seconds'
        }
    },
    home: {
        title: 'Home',
        newUser: 'New user',
        stats: {
            users: 'Users',
            signUps: 'Sign-ups',
            onlineNow: 'Online now',
            activeSessions: 'Active sessions',
            banned: 'Banned'
        },
        signUps: 'Sign-ups',
        ranges: {
            last7Days: 'Last 7 days',
            last14Days: 'Last 14 days',
            last30Days: 'Last 30 days',
            last3Months: 'Last 3 months',
            last6Months: 'Last 6 months',
            lastYear: 'Last year'
        },
        pickDate: 'Pick a date',
        // Lowercase: the select capitalises them.
        periods: {
            daily: 'daily',
            weekly: 'weekly',
            monthly: 'monthly'
        },
        newUsers: 'New users'
    },
    export: {
        button: 'Export'
    },
    import: {
        button: 'Import',
        title: 'Import users',
        description: 'Create users from a CSV file: a header row naming the columns, then a user per row.',
        columns: 'Columns it reads (email is required):',
        drop: 'Drop a CSV file here, or choose one',
        dropHint: 'Up to {count} users. An export from here works too.',
        empty: 'That file is empty.',
        noEmail: 'The file needs an email column.',
        tooMany: 'Import at most {count} users at a time.',
        ready: {
            one: 'Ready to import 1 user. An existing email is skipped, not changed.',
            other: 'Ready to import {count} users. Existing emails are skipped, not changed.'
        },
        ignored: 'Ignored columns: {columns}.',
        sendLinks: 'Email the {count} people without a password a link to set one',
        submit: { one: 'Import 1 user', other: 'Import {count} users' },
        importFailed: "Couldn't import the users",
        created: { one: 'Created 1 user', other: 'Created {count} users' },
        linksSent: 'Emailed {count} of them a link to set a password.',
        skipped: 'Skipped {count}',
        failed: "Couldn't create {count}",
        row: 'Row {row}',
        another: 'Import another file',
        done: 'Done'
    },
    users: {
        title: 'Users',
        filters: {
            all: 'All users',
            role: '{role}s',
            banned: 'Banned',
            unverified: 'Unverified',
            noTwoFactor: 'Two-factor off',
            guests: 'Guests'
        },
        guestAccount: 'Guest account',
        searchByEmail: 'Search by email…',
        searchByName: 'Search by name…',
        display: 'Display',
        loadFailed: "Couldn't load users",
        footer: '{selected} of {count} on this page selected · {total} users',
        columns: {
            user: 'User',
            role: 'Role',
            status: 'Status',
            email: 'Email',
            signIn: 'Sign-in',
            joined: 'Joined'
        },
        selectAll: 'Select all',
        selectRow: 'Select row',
        none: 'None',
        viewDetails: 'View details',
        copyId: 'Copy user ID'
    },
    user: {
        title: 'User',
        users: 'Users',
        actions: 'Actions',
        loadFailed: "Couldn't load this user",
        backToUsers: 'Back to users',
        banned: 'Banned',
        noReason: 'No reason given',
        until: 'until',
        untilUnbanned: 'until unbanned',
        emailVerified: 'Email verified',
        emailUnverified: 'Email unverified',
        twoFactorRequired: 'Two-factor required, not set up',
        details: {
            title: 'Details',
            userId: 'User ID',
            phone: 'Phone',
            phoneVerified: 'Verified',
            phoneUnverified: 'Not verified',
            lastUpdated: 'Last updated',
            notSinceTracking: 'Not since tracking started'
        },
        signInMethods: {
            title: 'Sign-in methods',
            description: 'How {name} signs in.',
            none: "No sign-in methods. They can't sign in until they reset their password.",
            connected: 'Connected',
            accountId: '{provider} ID {id}',
            menu: '{provider} actions',
            copyId: 'Copy account ID',
            removeOnly: 'Remove (their only sign-in method)'
        },
        sessions: {
            title: 'Sessions',
            description: 'Where {name} is signed in.',
            none: 'No active sessions.',
            thisSession: 'This session',
            active: 'active',
            expires: 'expires'
        },
        activity: {
            title: 'Activity',
            description: "Sign-ins and changes to {name}'s account, and who made them.",
            all: 'All {count} entries'
        }
    },
    sessions: {
        title: 'Sessions',
        intro: 'Everyone signed in right now, most recently active first. "Last active" is when Better Auth last refreshed the session, so it can be up to a day old.',
        loadFailed: "Couldn't load sessions",
        secondaryStorage:
            "Sessions are kept in secondary storage (eg Redis), not the database, so they can't be listed here.",
        empty: 'Nobody is signed in.',
        count: {
            one: '{count} session',
            other: '{count} sessions'
        },
        columns: {
            user: 'User',
            device: 'Device',
            signedIn: 'Signed in',
            expires: 'Expires'
        },
        deletedUser: 'Deleted user',
        signOutFailed: "Couldn't sign it out"
    },
    modals: {
        ban: {
            titleOne: 'Ban {name}',
            titleMany: 'Ban {count} users',
            description: "They're signed out everywhere and can't sign in until the ban ends.",
            reason: 'Reason',
            reasonHelp: 'Optional. Shown to them when they try to sign in.',
            duration: 'Duration',
            durations: {
                untilUnbanned: 'Until unbanned',
                oneHour: '1 hour',
                oneDay: '1 day',
                sevenDays: '7 days',
                thirtyDays: '30 days'
            },
            failed: "Couldn't ban {failed} of {total}",
            bannedOne: 'User banned',
            bannedMany: '{count} users banned'
        },
        create: {
            title: 'Add user',
            description: 'Create an account. They can sign in straight away.',
            passwordHelp: 'Optional. At least 8 characters.',
            create: 'Create',
            created: 'User created',
            open: 'Open',
            failed: "Couldn't create the user"
        },
        delete: {
            titleOne: 'Delete {name}',
            titleMany: 'Delete {count} users',
            description: "Their account, sessions and sign-in methods are removed. This can't be undone.",
            failed: "Couldn't delete {failed} of {total}",
            deletedOne: 'User deleted',
            deletedMany: '{count} users deleted'
        },
        edit: {
            title: 'Edit user',
            avatarUrl: 'Avatar URL',
            optional: 'Optional.',
            emailVerified: 'Email verified',
            updated: 'User updated',
            failed: "Couldn't update the user"
        },
        password: {
            emailLink: 'Email them a link to choose a new password themselves.',
            sendReset: 'Send reset link',
            or: 'or',
            setNew: 'Set a new password',
            help: 'At least 8 characters.',
            setPassword: 'Set password',
            set: 'Password set',
            tellThem: 'Tell {name} their new password.',
            setFailed: "Couldn't set the password",
            resetSent: 'Reset link sent',
            resetFailed: "Couldn't send the reset link"
        },
        removeAccount: {
            title: 'Remove {provider}?',
            credential:
                '{name}\'s password will stop working. They can still sign in another way, or set a new password with "Forgot password".',
            other: "{name} won't be able to sign in with {provider} until they connect it again.",
            removed: '{provider} removed',
            failed: "Couldn't remove {provider}"
        },
        role: {
            help: "{role} can do everything here; other roles only what they're allowed.",
            changed: 'Role changed',
            now: '{name} is now {role}',
            failed: "Couldn't change the role"
        }
    },
    security: {
        title: 'Security',
        description: 'Two-factor and passkeys. If {name} lost a device, turn two-factor off or remove the passkey.',
        twoFactor: 'Two-factor',
        on: 'On: a code is asked for after they sign in.',
        offRequired: 'Off, though their role requires it: they will be asked to set it up.',
        off: 'Off.',
        turnOff: 'Turn off',
        noPasskeys: 'No passkeys.',
        passkey: 'Passkey',
        synced: 'Synced',
        oneDevice: 'On one device',
        added: 'added',
        resetTitle: 'Turn off two-factor?',
        resetDescription:
            '{name} will sign in with just their password until they set it up again. Their authenticator app, backup codes and trusted devices stop working.',
        turnOffTwoFactor: 'Turn off two-factor',
        turnedOff: 'Two-factor turned off',
        askedAgain: '{name} will be asked to set it up again.',
        canSetUpAgain: '{name} can set it up again from their account.',
        resetFailed: "Couldn't reset two-factor",
        removeTitle: 'Remove this passkey?',
        removeDescription: "{name} won't be able to sign in with “{passkey}” any more.",
        removePasskey: 'Remove passkey',
        removed: 'Removed {passkey}',
        thePasskey: 'the passkey',
        removeFailed: "Couldn't remove the passkey"
    },
    subscription: {
        title: 'Subscription',
        description: "{name}'s plan, from Stripe. Changes go through Stripe's dashboard or their billing tab.",
        none: 'No subscription.',
        renews: 'Renews',
        ends: 'Ends'
    },
    fields: {
        title: 'More details',
        description: "Your app's own fields.",
        edit: 'Edit details',
        editTitle: "Edit {name}'s details",
        yes: 'Yes',
        no: 'No',
        commaSeparated: 'Separate values with commas.',
        saved: 'Details saved',
        failed: "Couldn't save the details"
    },
    apiKeys: {
        title: 'API keys',
        description: "{name}'s keys for scripts and integrations. Revoke one that leaked.",
        none: 'No API keys.',
        unnamed: 'Unnamed key',
        lastUsed: 'Last used',
        neverUsed: 'Never used',
        expires: 'expires',
        noExpiry: 'never expires',
        revokeTitle: 'Revoke this key?',
        revokeDescription: 'Anything using “{key}” stops working at once.',
        revoke: 'Revoke key',
        revoked: 'Revoked {key}',
        revokeFailed: "Couldn't revoke the key"
    },
    notes: {
        title: 'Notes',
        description: 'Private to staff: {name} never sees these.',
        placeholder: 'Add a note, eg "Warned for spam in chat"',
        add: 'Add note',
        added: 'Note added',
        addFailed: "Couldn't add the note",
        none: 'No notes yet.',
        deleteTitle: 'Delete this note?',
        deleteDescription: 'The audit log keeps that it was deleted, not what it said.',
        deleteNote: 'Delete note',
        deleted: 'Note deleted',
        deleteFailed: "Couldn't delete the note",
        by: 'by {name}'
    },
    configuration: {
        title: 'Configuration',
        introBefore: 'How {app} is set up, from its Better Auth config and the',
        introAfter: 'options in nuxt.config. Read-only: change them in code.',
        theApp: 'the app',
        on: 'On',
        off: 'Off',
        sections: {
            signIn: 'Signing in',
            security: 'Security',
            integrations: 'Apps and integrations',
            selfService: 'Self-service',
            emails: 'Emails',
            records: 'Admin records'
        },
        rows: {
            emailAndPassword: 'Email and password',
            signUps: 'Sign-ups',
            open: 'Open',
            closed: 'Closed',
            emailVerification: 'Email verification',
            requiredToSignIn: 'Required to sign in',
            sentNotRequired: 'Sent, not required',
            passwords: 'Passwords',
            characters: '{min}–{max} characters',
            canReset: 'Can be reset by email',
            cantReset: "Can't be reset by email",
            socialProviders: 'Social providers',
            none: 'None',
            passkeys: 'Passkeys',
            magicLinks: 'Magic links',
            emailCodes: 'Codes by email',
            digits: '{count} digits',
            phoneCodes: 'Codes by text',
            phoneSignUp: 'A new number creates an account',
            guestAccounts: 'Guest accounts',
            deviceSignIn: 'Device sign-in (codes)',
            apiKeys: 'API keys',
            organizations: 'Organizations',
            organizationsNoCreate: "Users can't create them",
            sso: 'Single sign-on',
            ssoDomainsVerified: 'Providers work once their domains are verified',
            ssoDomainsUnverified: "Domains aren't verified: turn on sso.domainVerification in production",
            stripe: 'Subscriptions (Stripe)',
            bearerTokens: 'Bearer tokens',
            oauthPopup: 'Provider sign-in in a popup',
            jwt: 'JWTs for other services',
            jwksAt: 'Public keys (JWKS): {url}',
            usernames: 'Usernames',
            usernameImmutable: "Can't be changed once set",
            lastUsed: 'Last-used hint',
            lastUsedHint: 'A cookie remembers how they last signed in',
            multiSession: 'Several accounts at once',
            multiSessionValue: 'Up to {count} per browser',
            twoFactor: 'Two-factor',
            authenticatorOrEmail: 'Authenticator app or email codes',
            authenticator: 'Authenticator app',
            requiredFor: 'Required for',
            everyone: 'Everyone',
            nobody: 'Nobody (optional)',
            requiredHint: 'Passkey sign-ins count; password sign-ins need a code',
            withoutPassword: 'Without a password',
            canTurnOn: 'Can turn it on',
            cantTurnOn: "Can't turn it on",
            breachedPasswords: 'Breached passwords',
            refused: 'Refused (Have I Been Pwned)',
            allowed: 'Allowed',
            securityAlerts: 'Security alerts',
            securityAlertsHint: 'Emailed to the account’s owner',
            alerts: {
                newSignIn: 'new devices',
                passwordChanged: 'password changes',
                twoFactor: 'two-factor',
                passkeyAdded: 'new passkeys'
            },
            captcha: 'Captcha',
            onSignUp: 'On signing up',
            impersonation: 'Impersonation',
            impersonationOn: 'Admins can sign in as users',
            changingEmail: 'Changing email',
            changeEmailApproved: 'On, approved from the current address',
            deletingAccount: 'Deleting their account',
            deleteByEmail: 'On, confirmed by email',
            delivery: 'Delivery',
            yourSender: 'Your sender',
            notSetUp: 'Not set up',
            yourTemplate: 'Your template',
            plainDefault: 'Plain-text default',
            auditLog: 'Audit log',
            keptDays: 'Kept {days} days',
            keptForever: 'Kept forever',
            signInsInLog: "Users' sign-ins in the log",
            activityTracking: 'Activity tracking',
            every: {
                one: 'Every {count} minute',
                other: 'Every {count} minutes'
            },
            activityHint: '"Last active" and "online now"',
            userNotes: 'Staff notes on users',
            adminPages: 'Admin pages'
        },
        // The emails in words; the template name shows under each.
        emails: {
            verifyEmail: 'Verify email',
            resetPassword: 'Reset password',
            existingUserSignUp: 'Sign-up with a taken email',
            changeEmailConfirmation: 'Approve an email change',
            deleteAccount: 'Confirm deleting an account',
            twoFactorCode: 'Two-factor code',
            magicLink: 'Sign-in link',
            emailCode: 'Code by email',
            newSignIn: 'Alert: new sign-in',
            passwordChanged: 'Alert: password changed',
            twoFactorChanged: 'Alert: two-factor on or off',
            passkeyAdded: 'Alert: passkey added',
            organizationInvitation: 'Organization invitation'
        },
        roles: {
            title: 'Roles and permissions',
            descriptionBefore: "What each role can do in the admin pages and Better Auth's admin endpoints. Roles with",
            descriptionAfter: 'can open these pages.',
            staff: 'Staff',
            permission: 'Permission',
            allowed: 'Allowed',
            notAllowed: 'Not allowed'
        },
        // Better Auth's Admin permissions.
        permissions: {
            user: {
                list: 'See the user list',
                get: 'View a user',
                create: 'Create users',
                update: 'Edit names and details',
                setEmail: 'Change emails',
                setPassword: 'Set passwords',
                setRole: 'Change roles',
                ban: 'Ban and unban',
                impersonate: 'Sign in as a user',
                impersonateAdmins: 'Sign in as an admin',
                delete: 'Delete users'
            },
            session: {
                list: 'See sessions',
                revoke: 'Sign sessions out',
                delete: 'Delete sessions'
            }
        }
    }
};
