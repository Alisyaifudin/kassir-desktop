import { useUser } from "~/hooks/use-user";
import { navGroupsOf, navOf } from "./util-nav";

/**
 * Settings destinations for the signed-in user: `items` flat for the sidebar,
 * `groups` sectioned for the index card grid.
 */
export function useNav() {
  const { role } = useUser();
  return { items: navOf(role), groups: navGroupsOf(role) };
}
