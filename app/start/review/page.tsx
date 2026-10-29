import { redirect } from "next/navigation";
import { withPlanData } from "@/app/plan/plan-data";
import { ButtonLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader, Panel } from "@/app/ui/panel";
import { Tag } from "@/app/ui/stamp";
import { buildPlan, type PlanItem } from "@/lib/plan/engine";
import { factsToAsk } from "@/lib/plan/facts";
import { roomName } from "@/lib/plan/floor-plan";
import { selectPlanInput } from "@/lib/plan/select";
import { parsePlanQuery, planQuery } from "@/lib/plan/url-state";
import { assessRisk } from "@/lib/risk/assess";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return withPlanData(data => {
    const parsed = parsePlanQuery(sp, []);
    const risk = parsed && assessRisk(parsed.answers);
    const profile = data.profiles.find(p => p._id === risk?.profileId);
    if (!parsed || !risk || !profile) redirect("/start");

    const plan = buildPlan(selectPlanInput(data, { profileId: profile._id, toolIds: [], facts: parsed.facts }));
    const inPlan = plan.items.filter(i => i.level < 2);
    const skipped = inPlan.filter(i => i.heading === "skipped");
    const settled = inPlan.filter(i => i.heading === "you" && i.reason === "You said this applies to your app.");
    // One group per answer: every skipped item already carries the sentence its answer wrote.
    const groups = new Map<string, PlanItem[]>();
    for (const item of skipped) groups.set(item.reason, [...(groups.get(item.reason) ?? []), item]);

    const told = factsToAsk(profile, parsed.facts).map(fact => {
      const answer = parsed.facts[fact.id];
      const text =
        fact.kind === "choice"
          ? `${fact.question} ${fact.options.find(o => o.value === answer)?.label ?? "No answer"}.`
          : answer === "yes"
            ? `${fact.label}.`
            : fact.noReason;
      return { id: fact.id, text };
    });
    const query = planQuery(parsed.answers, [], parsed.facts);

    return (
      <div className="flex max-w-page flex-col gap-8">
        <PageHeader title="How we read your app">
          {risk.appType}. {inPlan.length - skipped.length} of {inPlan.length} requirements apply to it.
        </PageHeader>

        <Panel title="What you told us">
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {told.map(t => (
              <li key={t.id}>{t.text}</li>
            ))}
          </ul>
        </Panel>

        {groups.size > 0 ? (
          <Panel title={`Left out because of your answers (${skipped.length})`}>
            <div className="flex flex-col gap-6">
              {[...groups].map(([reason, items]) => (
                <div key={reason} className="flex flex-col gap-2">
                  <h3 className="text-lead font-semibold">{reason}</h3>
                  <p className="text-small text-ink-soft">So these do not apply:</p>
                  <ul className="flex flex-col gap-1">
                    {items.map(i => (
                      <li key={i.key} className="flex flex-wrap items-baseline gap-x-2">
                        <span>{i.plain?.title ?? i.title}</span>
                        <Tag>{roomName(i.family)}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        ) : (
          <Note tone="info">Nothing is left out. Every requirement applies to your app.</Note>
        )}

        {settled.length > 0 && (
          <Panel title={`Added to your tasks because of your answers (${settled.length})`}>
            <ul className="flex flex-col gap-1">
              {settled.map(i => (
                <li key={i.key}>{i.plain?.title ?? i.title}</li>
              ))}
            </ul>
          </Panel>
        )}

        <p className="max-w-measure text-ink-soft">
          Next, you pick the tools your team uses. Each tool already covers some requirements, so your list gets shorter. You can change any answer later.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink href={`/plan?${query}`}>See your build plan</ButtonLink>
          <ButtonLink variant="secondary" href={`/start/app?${query}`}>
            Change my answers
          </ButtonLink>
        </div>
      </div>
    );
  });
}
