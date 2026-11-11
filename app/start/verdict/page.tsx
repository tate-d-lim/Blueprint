import { redirect } from "next/navigation";
import { withPlanData } from "@/app/plan/plan-data";
import { ButtonLink, TextLink } from "@/app/ui/button";
import contacts from "@/data/seed/contacts.json";
import { verdictFor } from "@/lib/plan/verdict";
import { startQuery, parseStartQuery } from "@/lib/plan/url-state";
import { OPTION_LABELS, RISK_SOURCE_URL, type RiskAnswers } from "@/lib/risk/assess";
import { StepBar, StepHeading } from "../step-nav";

/** Step 2: the app type, from the answers. Missing or broken answers go back to step 1 with the rest filled in. */
export default async function VerdictPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, complete, facts, projectId } = parseStartQuery(await searchParams);
  if (!complete) redirect(`/start?${startQuery(answers, facts, projectId ?? undefined)}`);
  const query = startQuery(complete, facts, projectId ?? undefined);

  return withPlanData(data => {
    const verdict = verdictFor(complete, data.profiles, data.versions);
    return (
      <div className="flex max-w-form flex-col gap-8">
        <StepBar step={2} back={`/start?${query}`} />
        <StepHeading title={verdict.heading}>{verdict.sentence}</StepHeading>
        {verdict.coverageLine && <p className="max-w-measure text-body text-ink">{verdict.coverageLine}</p>}

        <div className="flex flex-col gap-3 border-t border-rule pt-6">
          <h2 className="text-title font-semibold">Why</h2>
          <ul className="flex max-w-measure list-disc flex-col gap-1 pl-5">
            {verdict.reasons.map(r => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-ink-soft">
            Based on{" "}
            <TextLink href={RISK_SOURCE_URL} external>
              GovTech&apos;s risk materiality levels
            </TextLink>
            .
          </p>
        </div>

        {verdict.kind === "plan" ? (
          <div>
            <ButtonLink href={`/start/app?${query}`}>Next: about your app</ButtonLink>
          </div>
        ) : (
          <CannotPlan answers={complete} />
        )}
      </div>
    );
  }, projectId);
}

function CannotPlan({ answers }: { answers: RiskAnswers }) {
  const rows: [string, string][] = [
    ["Highest data classification", OPTION_LABELS.classification[answers.classification]],
    ["Sensitivity", OPTION_LABELS.sensitivity[answers.sensitivity]],
    ["Worst impact", OPTION_LABELS.impact[answers.impact]],
    ["Impact on systems that depend on it", OPTION_LABELS.downstream[answers.downstream]],
    ["Critical Information Infrastructure (CII)", answers.cii ? "Yes" : "No"],
    ["SII", answers.sii ? "Yes" : "No"],
  ];
  return (
    <>
      <div className="flex flex-col gap-2 border-t border-rule pt-6">
        <h2 className="text-title font-semibold">Who to ask</h2>
        <p className="text-body font-medium">{contacts.cannotPlan.who}</p>
        <p className="text-body text-ink-soft">{contacts.cannotPlan.how}</p>
      </div>
      <div className="flex flex-col gap-3 border-t border-rule pt-6">
        <h2 className="text-title font-semibold">Your answers</h2>
        <dl className="grid max-w-measure grid-cols-[1fr_auto] gap-x-8 gap-y-1.5 text-body">
          {rows.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-ink-soft">{term}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
