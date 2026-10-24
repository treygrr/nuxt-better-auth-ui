/** How each sign-in method is shown in the admin pages. Unknown providers fall back to their id. */
const PROVIDERS: Record<string, { label: string; icon: string }> = {
    credential: { label: 'Email and password', icon: 'i-lucide-key-round' },
    google: { label: 'Google', icon: 'i-simple-icons-google' },
    github: { label: 'GitHub', icon: 'i-simple-icons-github' },
    discord: { label: 'Discord', icon: 'i-simple-icons-discord' },
    apple: { label: 'Apple', icon: 'i-simple-icons-apple' },
    microsoft: { label: 'Microsoft', icon: 'i-simple-icons-microsoft' },
    facebook: { label: 'Facebook', icon: 'i-simple-icons-facebook' },
    twitter: { label: 'X', icon: 'i-simple-icons-x' },
    gitlab: { label: 'GitLab', icon: 'i-simple-icons-gitlab' }
};

export const providerInfo = (providerId: string) =>
    PROVIDERS[providerId] ?? { label: providerId, icon: 'i-lucide-link' };

/** Email and password first, then social providers alphabetically. */
export const sortProviders = (providerIds: string[]) =>
    [...new Set(providerIds)].sort((a, b) => (a === 'credential' ? -1 : b === 'credential' ? 1 : a.localeCompare(b)));
