/** Better Auth's Admin permissions in plain words, in the order the role editor shows them. */
export const PERMISSIONS: Array<{
    resource: string;
    label: string;
    actions: Array<{ action: string; label: string }>;
}> = [
    {
        resource: 'user',
        label: 'Users',
        actions: [
            { action: 'list', label: 'See the users list (opens the admin pages)' },
            { action: 'get', label: "View a user's details" },
            { action: 'create', label: 'Add users' },
            { action: 'update', label: 'Edit names and avatars, remove sign-in methods' },
            { action: 'set-email', label: 'Change emails and verification' },
            { action: 'set-role', label: 'Change roles' },
            { action: 'ban', label: 'Ban and unban' },
            { action: 'set-password', label: 'Set passwords' },
            { action: 'impersonate', label: 'Sign in as users' },
            { action: 'impersonate-admins', label: 'Sign in as staff too' },
            { action: 'delete', label: 'Delete users' }
        ]
    },
    {
        resource: 'session',
        label: 'Sessions',
        actions: [
            { action: 'list', label: 'See where users are signed in' },
            { action: 'revoke', label: 'Sign sessions out' },
            { action: 'delete', label: 'Delete sessions' }
        ]
    }
];

/** How many of all the permissions a role has. */
export const permissionCount = (permissions: Record<string, string[]>) =>
    Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0);

export const TOTAL_PERMISSIONS = PERMISSIONS.reduce((sum, group) => sum + group.actions.length, 0);
