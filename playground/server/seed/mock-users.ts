/**
 * Realistic mock users for trying the admin pages in development: a spread of join dates, verified and
 * unverified emails, extra admins, bans (permanent, expiring, expired), linked GitHub, Google and Discord
 * accounts (some users have no password), and active sessions on different devices.
 *
 * Deterministic: the same count always produces the same users, so re-running only adds what's missing.
 */

type Adapter = {
    findUserByEmail(email: string): Promise<{ user: { id: string } } | null>;
    createUser(user: Record<string, unknown>): Promise<{ id: string }>;
    createAccount(account: Record<string, unknown>): Promise<unknown>;
    createSession(
        userId: string,
        dontRememberMe?: boolean,
        override?: Record<string, unknown>,
        overrideAll?: boolean
    ): Promise<unknown>;
};

export type SeedContext = {
    internalAdapter: Adapter;
    password: { hash(password: string): Promise<string> };
};

const FIRST = [
    'Ava',
    'Liam',
    'Mia',
    'Noah',
    'Zoe',
    'Ethan',
    'Isla',
    'Lucas',
    'Chloe',
    'Mateo',
    'Aria',
    'Leo',
    'Nora',
    'Omar',
    'Priya',
    'Kenji',
    'Sofia',
    'Diego',
    'Hana',
    'Felix',
    'Amara',
    'Ravi',
    'Elena',
    'Jonah',
    'Yara',
    'Tomás',
    'Freya',
    'Kai',
    'Lena',
    'Malik'
];
const LAST = [
    'Johnson',
    'Nguyen',
    'Garcia',
    'Okafor',
    'Schmidt',
    'Rossi',
    'Tanaka',
    'Silva',
    'Kowalski',
    'Haddad',
    'Patel',
    'Larsen',
    'Moreau',
    'Kim',
    'Andersson',
    'Costa',
    'Novak',
    'Ibrahim',
    'Fischer',
    'Ortega'
];

const DEVICES = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 Edg/141.0'
];

/** Sign-in methods, by share of users. */
const METHODS: Array<{ weight: number; providers: string[] }> = [
    { weight: 45, providers: ['credential'] },
    { weight: 20, providers: ['credential', 'github'] },
    { weight: 10, providers: ['credential', 'google'] },
    { weight: 5, providers: ['credential', 'discord'] },
    { weight: 10, providers: ['google'] },
    { weight: 6, providers: ['github'] },
    { weight: 4, providers: ['github', 'google'] }
];

const DAY = 24 * 60 * 60 * 1000;

/** A small seeded random number generator (mulberry32), so the data is the same every time. */
function random(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export async function seedMockUsers(context: SeedContext, count: number, password: string) {
    const rng = random(2026);
    const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)]!;
    const weighted = () => {
        let roll = rng() * METHODS.reduce((sum, method) => sum + method.weight, 0);
        for (const method of METHODS) if ((roll -= method.weight) < 0) return method.providers;
        return METHODS[0]!.providers;
    };
    const passwordHash = await context.password.hash(password);
    const now = Date.now();
    let created = 0;

    for (let i = 0; i < count; i++) {
        // Draw every value up front, so skipping an existing user keeps the rest of the sequence the same.
        const first = FIRST[i % FIRST.length]!;
        const last = LAST[(i * 7) % LAST.length]!;
        const email = `${first}.${last}${i >= FIRST.length ? i : ''}@example.com`
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '');
        const createdAt = new Date(now - rng() * 180 * DAY);
        const emailVerified = rng() < 0.75;
        const hasImage = rng() < 0.6;
        const providers = weighted();
        const sessionCount = rng() < 0.6 ? 1 + Math.floor(rng() * 3) : 0;
        const sessions = Array.from({ length: sessionCount }, () => ({
            userAgent: pick(DEVICES),
            ipAddress: `${pick(['203.0.113', '198.51.100', '192.0.2'])}.${1 + Math.floor(rng() * 253)}`,
            lastActive: new Date(now - rng() * 3 * DAY)
        }));

        // A few fixed cases, so each state shows up.
        const role = i === 3 || i === 11 ? 'admin' : 'user';
        const ban =
            i === 5
                ? { banned: true, banReason: 'Spamming other users', banExpires: null }
                : i === 9
                  ? { banned: true, banReason: 'Repeated abuse reports', banExpires: new Date(now + 3 * DAY) }
                  : i === 14
                    ? { banned: true, banReason: 'Cooling-off period', banExpires: new Date(now - 2 * DAY) }
                    : { banned: false, banReason: null, banExpires: null };

        if (await context.internalAdapter.findUserByEmail(email)) continue;

        const user = await context.internalAdapter.createUser({
            name: `${first} ${last}`,
            email,
            emailVerified,
            image: hasImage ? `https://i.pravatar.cc/128?u=${encodeURIComponent(email)}` : null,
            role,
            ...ban,
            createdAt,
            updatedAt: createdAt
        });

        for (const providerId of providers) {
            const linkedAt = new Date(createdAt.getTime() + rng() * 30 * DAY);
            await context.internalAdapter.createAccount({
                userId: user.id,
                providerId,
                ...(providerId === 'credential'
                    ? { accountId: user.id, password: passwordHash, createdAt, updatedAt: createdAt }
                    : {
                          accountId: String(10_000_000 + Math.floor(rng() * 89_999_999)),
                          scope: providerId === 'github' ? 'read:user,user:email' : 'openid,email,profile',
                          createdAt: linkedAt,
                          updatedAt: linkedAt
                      })
            });
        }

        // Banning signs people out, so banned users only keep sessions once the ban has ended.
        if (!ban.banned || (ban.banExpires && ban.banExpires.getTime() < now)) {
            for (const session of sessions) {
                // overrideAll, or Better Auth's defaults replace the device, IP and dates.
                await context.internalAdapter.createSession(
                    user.id,
                    false,
                    {
                        userAgent: session.userAgent,
                        ipAddress: session.ipAddress,
                        createdAt: session.lastActive,
                        updatedAt: session.lastActive
                    },
                    true
                );
            }
        }
        created++;
    }
    return created;
}
