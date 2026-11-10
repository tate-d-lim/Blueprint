import { withPlanData } from "@/app/plan/plan-data";
import { ButtonLink } from "@/app/ui/button";
import { startQuery } from "@/lib/plan/url-state";
import { verdictFor } from "@/lib/plan/verdict";
import { profileFor } from "@/lib/risk/assess";
import { ToolsView } from "./tools-view";

/** Step 5: the first page of a new project. An unknown project is "not found". */
export default async function ToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withPlanData((data, project) => {
    if (!project) return null;
    const profileId = profileFor(project.riskAnswers, data.profiles);
    const profile = data.profiles.find(p => p._id === profileId);
    if (!profile) {
      const verdict = verdictFor(project.riskAnswers, data.profiles, data.versions);
      return (
        <div className="flex max-w-form flex-col gap-4">
          <h1 className="wide text-display font-semibold">{verdict.heading}</h1>
          <p className="text-lead text-ink-soft">{verdict.sentence}</p>
          <div>
            <ButtonLink href={`/start/needs?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`} variant="secondary">
              Change answers
            </ButtonLink>
          </div>
        </div>
      );
    }
    return <ToolsView data={data} project={project} profileId={profile._id} profileTitle={profile.title} />;
  }, id);
}
