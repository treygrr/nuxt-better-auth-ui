// The API behind the playground's own admin page: the module's permission check, then Better Auth's database.
export default defineEventHandler(async (event) => {
    const { context } = await requireBetterAuthAdmin(event, { user: ['set-role'] });
    const { roles } = useRuntimeConfig().public.betterAuthUi.admin as { roles: string[] };
    return Promise.all(
        roles.map(async (role) => ({
            role,
            users: Number(await context.adapter.count({ model: 'user', where: [{ field: 'role', value: role }] }))
        }))
    );
});
