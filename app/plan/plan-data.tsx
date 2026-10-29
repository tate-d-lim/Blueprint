import { Note } from "@/app/ui/note";
import { DatabaseUnavailableError, withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import type { PlanData } from "@/lib/plan/engine";

/** Loads the plan data for a page, or shows the "start the database" note when it is not running. */
export async function withPlanData(render: (data: PlanData) => React.ReactNode | Promise<React.ReactNode>) {
  let data: PlanData;
  try {
    data = await withDb(loadPlanData);
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
  return render(data);
}
