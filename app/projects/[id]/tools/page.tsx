import { withPlanData } from "@/app/plan/plan-data";
import { profileFor } from "@/lib/risk/assess";
import { NoProfile } from "../no-profile";
import { ToolsView } from "./tools-view";

/** Step 5: the first page of a new project. An unknown project is "not found". */
export default async function ToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withPlanData((data, project) => {
    if (!project) return null;
    const profile = data.profiles.find(p => p._id === profileFor(project.riskAnswers, data.profiles));
    if (!profile) return <NoProfile project={project} profiles={data.profiles} versions={data.versions} />;
    return <ToolsView data={data} project={project} profileId={profile._id} profileTitle={profile.title} />;
  }, id);
}
