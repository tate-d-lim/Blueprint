import { redirect } from "next/navigation";
import { DatabaseUnavailableError, withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import type { PlanData } from "@/lib/plan/engine";
import { parsePlanQuery } from "@/lib/plan/url-state";
import { assessRisk } from "@/lib/risk/assess";
import { PlanView } from "./plan-view";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  let data: PlanData;
  try {
    data = await withDb(loadPlanData);
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) {
      return (
        <div className="mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h1 className="font-semibold">{err.message}</h1>
          <p className="mt-2 text-sm text-muted">Then load the data with: npm run seed</p>
        </div>
      );
    }
    throw err;
  }

  const parsed = parsePlanQuery(sp, data.tools.map(t => t._id));
  if (!parsed || !assessRisk(parsed.answers).profileId) redirect("/start");

  return <PlanView data={data} answers={parsed.answers} initialToolIds={parsed.toolIds} />;
}
