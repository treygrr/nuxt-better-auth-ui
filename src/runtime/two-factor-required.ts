// Shared by the pages, the server and the Better Auth plugin, so no Nuxt or Nitro imports here.

/** Who must use two-factor: everyone (true), users with one of these roles, or nobody (false). */
export type TwoFactorRequired = boolean | string[];

/**
 * Whether a user must have two-factor on. Roles are read as Better Auth's Admin plugin stores them (comma-separated
 * for several); users without one have its default, `user`. Never guests (Better Auth's Anonymous plugin): they have
 * nothing to sign in with again, so it's asked for once they keep their account.
 */
export function requiresTwoFactor(
    user: { role?: string | null; isAnonymous?: boolean | null } | null | undefined,
    required: TwoFactorRequired
) {
    if (!user || !required || user.isAnonymous) return false;
    if (required === true) return true;
    return (user.role || 'user').split(',').some((role) => required.includes(role.trim()));
}

/** A signed-in user who must have two-factor on and hasn't set it up yet. */
export const needsTwoFactorSetUp = (
    user: { role?: string | null; twoFactorEnabled?: boolean | null; isAnonymous?: boolean | null } | null | undefined,
    required: TwoFactorRequired
) => requiresTwoFactor(user, required) && user?.twoFactorEnabled !== true;
