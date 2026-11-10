import { parseStartQuery } from "@/lib/plan/url-state";
import { StartForm } from "./start-form";
import { StepHeading } from "./step-nav";

export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, facts, projectId } = parseStartQuery(await searchParams);
  return (
    <div className="flex max-w-form flex-col gap-10">
      <StepHeading title="Tell us about your app">
        A few questions, so we can work out which security requirements apply. It takes about a minute.
      </StepHeading>
      <StartForm initial={answers} facts={facts} projectId={projectId} />
    </div>
  );
}
