import { requireMember } from "$lib/server/access";
import type { LayoutServerLoad } from "./$types";

/** Every page under /p/<project>/ is for signed-in members of the project's workspace. */
export const load: LayoutServerLoad = (event) => {
  const { project, workspace, role } = requireMember(event, event.params.project);
  return { project, workspace, role };
};
