import { redirect } from "next/navigation";
import { withPlanData } from "@/app/plan/plan-data";
import { factScreen } from "@/lib/plan/select";
import { parseStartQuery, startQuery } from "@/lib/plan/url-state";
import { profileFor } from "@/lib/risk/assess";
import { StepBar, StepHeading } from "../step-nav";
import { AppForm } from "./app-form";

/** Only the rules reach the browser, not the whole entries. */
const slim = (screen: NonNullable<ReturnType<typeof factScreen>>) => ({
  facts: screen.facts,
  entries: screen.entries.map(e => ({ plain: e.plain?.appliesWhen ? { appliesWhen: e.plain.appliesWhen } : undefined })),
});

/** Step 3: what is true about the app. No profile for the answers (or broken answers) goes back to step 1. */
export default async function AppFactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, complete, facts, projectId } = parseStartQuery(await searchParams);
  const query = startQuery(complete ?? answers, facts, projectId ?? undefined);
  if (!complete) redirect(`/start?${query}`);
  return withPlanData((data, project) => {
    const profile = data.profiles.find(p => p._id === profileFor(complete, data.profiles));
    if (!profile) redirect(`/start?${query}`);
    return (
      <div className="flex max-w-form flex-col gap-8">
        <StepBar step={3} back={`/start/verdict?${query}`} />
        <StepHeading title="About your app">
          Answer for your app as it is now, or as you plan it. Your plan leaves out the controls that cannot apply, and lists them.
        </StepHeading>
        <AppForm
          risk={complete}
          initial={facts}
          projectId={projectId}
          dirty={!!project && JSON.stringify(project.facts ?? {}) !== JSON.stringify(facts)}
          profile={slim(factScreen(data.profiles, profile._id)!)}
        />
      </div>
    );
  }, projectId);
}
