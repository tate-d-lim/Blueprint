import { notFound } from "next/navigation";
import { Note } from "@/app/ui/note";
import type { Project } from "@/lib/domain/types";
import { DatabaseUnavailableError, withDb } from "@/lib/data/db";
import { getProject } from "@/lib/data/repos/projects";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import type { PlanData } from "@/lib/plan/engine";

/**
 * Loads the plan data for a page (and the saved project in `projectId`, when the page is editing one), or shows the
 * "start the database" note when it is not running. A project that does not exist is a plain "not found" page.
 */
export async function withPlanData(
  render: (data: PlanData, project: Project | null) => React.ReactNode | Promise<React.ReactNode>,
  projectId: string | null = null,
) {
  let loaded: { data: PlanData; project: Project | null };
  try {
    loaded = await withDb(async db => ({ data: await loadPlanData(db), project: projectId ? await getProject(db, projectId) : null }));
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return (
        <div className="max-w-message">
          <Note tone="error" title={err.message}>
            Then load the data with: <code className="font-code text-small">npm run seed</code>
          </Note>
        </div>
      );
    }
    throw err;
  }
  if (projectId && !loaded.project) notFound();
  return render(loaded.data, loaded.project);
}
