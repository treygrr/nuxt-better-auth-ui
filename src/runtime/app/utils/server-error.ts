/**
 * A failed request's error, as useAuthI18n's `errorMessage` takes it: the code the module's routes give in `data.code`
 * (translated as `errors.<code>`), or Better Auth's own code, with the message as the fallback.
 */
export const serverError = (error: unknown) => {
    const data = (
        error as { data?: { statusMessage?: string; message?: string; code?: string; data?: { code?: string } } }
    ).data;
    return {
        code: data?.data?.code ?? data?.code,
        message:
            data?.statusMessage ??
            data?.message ??
            (error as { statusMessage?: string }).statusMessage ??
            (error as Error).message
    };
};
