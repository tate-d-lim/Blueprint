import { withPlanData } from "@/app/plan/plan-data";
import { parseStartQuery } from "@/lib/plan/url-state";
import { StartForm } from "./start-form";
import { StepBar, StepHeading } from "./step-nav";

export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, facts, projectId } = parseStartQuery(await searchParams);
  const heading = (
    <StepHeading title="Tell us about your app">
      Answer 5 questions about risk. Your answers decide which security controls apply. It takes about a minute.
    </StepHeading>
  );
  // Editing a saved project reads it, so an unknown project is "not found" and unsaved changes can be told from saved ones.
  const page = (stored?: Parameters<typeof StartForm>[0]["stored"]) => (
    <div className="flex max-w-form flex-col gap-10">
      <StepBar step={1} back={projectId ? `/projects/${projectId}` : "/projects"} className="-mb-2" />
      {heading}
      <StartForm initial={answers} facts={facts} projectId={projectId} stored={stored} />
    </div>
  );
  return projectId ? withPlanData((_data, project) => page(project?.riskAnswers), projectId) : page();
}
