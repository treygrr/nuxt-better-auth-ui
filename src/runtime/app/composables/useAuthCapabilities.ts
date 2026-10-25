import type { Ref } from 'vue';
import { useFetch } from '#imports';

import { UI_API } from '../../constants';
import type { AuthCapabilities } from '../../server/api/capabilities.get';

export type { AuthCapabilities };

/**
 * What the app's Better Auth set-up offers. Fetched during server rendering, once per page load. Await `loaded` to
 * decide what else to fetch from it.
 */
export const useAuthCapabilities = (): {
    capabilities: Ref<AuthCapabilities | undefined>;
    loaded: Promise<AuthCapabilities | undefined>;
} => {
    const request = useFetch<AuthCapabilities>(`${UI_API}/capabilities`, { key: 'better-auth-ui-capabilities' });
    return { capabilities: request.data, loaded: request.then(({ data }) => data.value) };
};
