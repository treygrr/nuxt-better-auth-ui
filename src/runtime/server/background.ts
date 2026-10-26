// Work done after the response (emails, texts), handed to Better Auth's `advanced.backgroundTasks.handler` when the app
// sets one: on serverless hosts, the host's `waitUntil`, so the function isn't stopped before the work is done.
// No Nuxt or Nitro imports: Better Auth's Nuxt module also loads the auth config at build time.
import type { BetterAuthPlugin } from 'better-auth';

type Handler = (task: Promise<unknown>) => void;

// On globalThis, so it's shared however this file is loaded (the package entries, the generated plugins, the stub
// build in development), and could be loaded twice. It's the app's config, the same for every request.
const KEY = Symbol.for('better-auth-ui.background-tasks');
const store = globalThis as { [KEY]?: Handler };

/** Runs a task without waiting for it, through the app's background task handler if it has one. Never throws. */
export function runInBackground(task: Promise<unknown>) {
    const handler = store[KEY];
    if (handler) handler(task);
    else void task;
}

/** Remembers the app's background task handler when Better Auth starts. Added by the module to every app. */
export const backgroundTasks = () =>
    ({
        id: 'better-auth-ui-background-tasks',
        init: (context) => {
            store[KEY] = context.options.advanced?.backgroundTasks?.handler;
        }
    }) satisfies BetterAuthPlugin;
