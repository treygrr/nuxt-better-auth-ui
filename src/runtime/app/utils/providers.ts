/**
 * How each sign-in method is shown: Better Auth's social providers by their id, and the Generic OAuth `providerId`s of
 * the module's provider helpers. Unknown providers fall back to their id.
 */
const PROVIDERS: Record<string, { label: string; icon: string }> = {
    credential: { label: 'Email and password', icon: 'i-lucide-key-round' },
    google: { label: 'Google', icon: 'i-simple-icons-google' },
    github: { label: 'GitHub', icon: 'i-simple-icons-github' },
    discord: { label: 'Discord', icon: 'i-simple-icons-discord' },
    apple: { label: 'Apple', icon: 'i-simple-icons-apple' },
    microsoft: { label: 'Microsoft', icon: 'i-simple-icons-microsoft' },
    facebook: { label: 'Facebook', icon: 'i-simple-icons-facebook' },
    twitter: { label: 'X', icon: 'i-simple-icons-x' },
    gitlab: { label: 'GitLab', icon: 'i-simple-icons-gitlab' },
    twitch: { label: 'Twitch', icon: 'i-simple-icons-twitch' },
    roblox: { label: 'Roblox', icon: 'i-simple-icons-roblox' },
    kick: { label: 'Kick', icon: 'i-simple-icons-kick' },
    spotify: { label: 'Spotify', icon: 'i-simple-icons-spotify' },
    linkedin: { label: 'LinkedIn', icon: 'i-simple-icons-linkedin' },
    reddit: { label: 'Reddit', icon: 'i-simple-icons-reddit' },
    tiktok: { label: 'TikTok', icon: 'i-simple-icons-tiktok' },
    slack: { label: 'Slack', icon: 'i-simple-icons-slack' },
    zoom: { label: 'Zoom', icon: 'i-simple-icons-zoom' },
    // Generic OAuth, through the module's provider helpers (@treygrr/nuxt-better-auth-ui/providers).
    'epic-games': { label: 'Epic Games', icon: 'i-simple-icons-epicgames' },
    'battle-net': { label: 'Battle.net', icon: 'i-simple-icons-battledotnet' }
};

export const providerInfo = (providerId: string) =>
    PROVIDERS[providerId] ?? { label: providerId, icon: 'i-lucide-link' };

/** Email and password first, then social providers alphabetically. */
export const sortProviders = (providerIds: string[]) =>
    [...new Set(providerIds)].sort((a, b) => (a === 'credential' ? -1 : b === 'credential' ? 1 : a.localeCompare(b)));
