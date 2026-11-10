import { notFound, redirect } from "next/navigation";
import { PlanView } from "@/app/plan/plan-view";
import { Breadcrumb } from "@/app/ui/table";
import { withPlanData } from "@/app/plan/plan-data";
import { profileFor } from "@/lib/risk/assess";
import { NoProfile } from "./no-profile";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withPlanData((data, project) => {
    if (!project) notFound();
    // A new project opens on the tools step until the builder leaves it with "Continue to your plan".
    if (!project.toolsReviewedAt) redirect(`/projects/${id}/tools`);
    const profile = data.profiles.find(p => p._id === profileFor(project.riskAnswers, data.profiles));
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Saved projects", href: "/projects" }, { label: project.name }]} />
        <p className="text-small text-ink-soft">
          Owner {project.ownerName} · Revised <span className="tnum">{project.updatedAt.slice(0, 10)}</span>
        </p>
        {profile ? (
          <PlanView data={data} project={project} profileId={profile._id} />
        ) : (
          <NoProfile project={project} profiles={data.profiles} versions={data.versions} />
        )}
      </div>
    );
  }, id);
}
