import type { DropdownMenuItem } from '@nuxt/ui';

/** Menu groups without the items the admin can't use (written as `false`), or groups left empty. */
export const shownItems = (groups: Array<Array<DropdownMenuItem | false | null>>): DropdownMenuItem[][] =>
    groups.map((group) => group.filter((item): item is DropdownMenuItem => !!item)).filter((group) => group.length);
