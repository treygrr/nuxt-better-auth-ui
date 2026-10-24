// Not an app: see ../auth.config.ts. The playground has the real auth config.
import { defineServerAuth } from '@nuxtjs/better-auth/config';

export default defineServerAuth({
    emailAndPassword: { enabled: true }
});
