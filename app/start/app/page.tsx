import { redirect } from "next/navigation";
import { withPlanData } from "@/app/plan/plan-data";
import { parseStartQuery, startQuery } from "@/lib/plan/url-state";
import { profileFor } from "@/lib/risk/assess";
import { BackLink, StepHeading } from "../step-nav";
import { AppForm } from "./app-form";

/** Step 3: what is true about the app. No profile for the answers (or broken answers) goes back to step 1. */
export default async function AppFactsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, complete, facts, projectId } = parseStartQuery(await searchParams);
  const query = startQuery(complete ?? answers, facts, projectId ?? undefined);
  if (!complete) redirect(`/start?${query}`);
  return withPlanData(data => {
    const profile = data.profiles.find(p => p._id === profileFor(complete, data.profiles));
    if (!profile) redirect(`/start?${query}`);
    return (
      <div className="flex max-w-form flex-col gap-8">
        <BackLink href={`/start/verdict?${query}`}>Back</BackLink>
        <StepHeading title="About your app">
          Tick what is true. We leave out the requirements that can&apos;t apply to your app, and we tell you which ones.
        </StepHeading>
        <AppForm
          risk={complete}
          initial={facts}
          projectId={projectId}
          profile={{ facts: profile.facts, entries: profile.entries.map(e => ({ plain: e.plain?.appliesWhen ? { appliesWhen: e.plain.appliesWhen } : undefined })) }}
        />
      </div>
    );
  });
}
