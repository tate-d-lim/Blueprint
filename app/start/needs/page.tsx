import { redirect } from "next/navigation";
import { withPlanData } from "@/app/plan/plan-data";
import { tasksAdded } from "@/lib/plan/effect";
import { buildPlan, type Plan } from "@/lib/plan/engine";
import { needsLine, partState, planTotals, visibleParts } from "@/lib/plan/hotel";
import { needsDetails, skippedItems } from "@/lib/plan/needs";
import { selectPlanInput } from "@/lib/plan/select";
import { parseStartQuery, startQuery } from "@/lib/plan/url-state";
import { profileFor } from "@/lib/risk/assess";
import { sourceLines } from "@/app/plan/sources";
import { NeedsView, type NeedsViewProps } from "./needs-view";

const NO_PLAN: Plan = { items: [], counts: { you: 0, platform: 0, questions: 0, skipped: 0, "good-to-have": 0 } };

/**
 * Step 4: what your app needs. Broken answers or no profile for them go back to step 1; a project in the link that does
 * not exist is "not found".
 */
export default async function NeedsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, complete, facts, projectId } = parseStartQuery(await searchParams);
  const query = startQuery(complete ?? answers, facts, projectId ?? undefined);
  if (!complete) redirect(`/start?${query}`);

  return withPlanData((data, project) => {
    const profile = data.profiles.find(p => p._id === profileFor(complete, data.profiles));
    if (!profile) redirect(`/start?${query}`);

    const plan = buildPlan(selectPlanInput(data, { profileId: profile._id, toolIds: [], facts }));
    const parts = visibleParts(plan).map(p => partState(p, plan, "needs"));
    const active = new Set(plan.items.map(i => i.profileId));
    const sources = sourceLines({ profiles: data.profiles.filter(p => active.has(p._id) || p._id === profile._id), tools: [], versions: data.versions, profileId: profile._id }).profiles;
    const noCoverage = !data.versions.some(v => v.current.profileId === profile._id);

    let edit: NeedsViewProps["edit"] = null;
    if (project) {
      const oldId = profileFor(project.riskAnswers, data.profiles);
      let typeChange: string | null = null;
      if (oldId !== profile._id) {
        const before = oldId ? buildPlan(selectPlanInput(data, { profileId: oldId, toolIds: project.toolIds, facts: project.facts }, project)) : NO_PLAN;
        const after = buildPlan(selectPlanInput(data, { profileId: profile._id, toolIds: project.toolIds, facts }, project));
        const k = tasksAdded(before, after);
        const from = data.profiles.find(p => p._id === oldId)?.title ?? "your current app type";
        typeChange = `Your app type changes from ${from} to ${profile.title}. ${k === 1 ? "1 control is" : `${k} controls are`} added. Controls you marked done stay done.`;
      }
      const dirty = JSON.stringify(project.riskAnswers) !== JSON.stringify(complete) || JSON.stringify(project.facts ?? {}) !== JSON.stringify(facts);
      edit = { projectId: project._id, projectName: project.name, dirty, typeChange };
    }

    return (
      <NeedsView
        profileTitle={profile.title}
        line={needsLine(planTotals(plan), !!project)}
        sources={sources}
        coverageLine={noCoverage ? `No tool covers ${profile.title} yet, so every part is yours.` : null}
        parts={parts}
        details={needsDetails(plan, data.profiles)}
        skipped={skippedItems(plan)}
        query={query}
        answers={complete}
        facts={facts}
        edit={edit}
      />
    );
  }, projectId);
}
