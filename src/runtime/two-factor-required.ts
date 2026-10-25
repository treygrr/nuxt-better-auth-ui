// Shared by the pages, the server and the Better Auth plugin, so no Nuxt or Nitro imports here.

/** Who must use two-factor: everyone (true), users with one of these roles, or nobody (false). */
export type TwoFactorRequired = boolean | string[];

/**
 * Whether a user must have two-factor on. Roles are read as Better Auth's Admin plugin stores them (comma-separated
 * for several); users without one have its default, `user`.
 */
export function requiresTwoFactor(user: { role?: string | null } | null | undefined, required: TwoFactorRequired) {
    if (!user || !required) return false;
    if (required === true) return true;
    return (user.role || 'user').split(',').some((role) => required.includes(role.trim()));
}

/** A signed-in user who must have two-factor on and hasn't set it up yet. */
export const needsTwoFactorSetUp = (
    user: { role?: string | null; twoFactorEnabled?: boolean | null } | null | undefined,
    required: TwoFactorRequired
) => requiresTwoFactor(user, required) && user?.twoFactorEnabled !== true;
