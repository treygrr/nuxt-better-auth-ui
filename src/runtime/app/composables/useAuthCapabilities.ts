import type { Ref } from 'vue';
import { useFetch } from '#imports';

import { UI_API } from '../../constants';
import type { AuthCapabilities } from '../../server/api/capabilities.get';

export type { AuthCapabilities };

/** What the app's Better Auth set-up offers. Fetched during server rendering, once per page load. */
export const useAuthCapabilities = (): { capabilities: Ref<AuthCapabilities | undefined> } => {
    const { data } = useFetch<AuthCapabilities>(`${UI_API}/capabilities`, { key: 'better-auth-ui-capabilities' });
    return { capabilities: data };
};
