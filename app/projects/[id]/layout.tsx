import { notFound } from "next/navigation";
import { ProjectShell } from "@/app/plan/project-shell";
import { withPlanData } from "@/app/plan/plan-data";
import { profileFor } from "@/lib/risk/assess";
import { NoProfile } from "./no-profile";

/** A saved project: its header and tabs, around the tab the builder is on. An unknown project is "not found". */
export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withPlanData((data, project) => {
    if (!project) notFound();
    const profile = data.profiles.find(p => p._id === profileFor(project.riskAnswers, data.profiles));
    if (!profile) return <NoProfile project={project} profiles={data.profiles} versions={data.versions} />;
    return (
      <ProjectShell data={data} project={project} profileId={profile._id} profileTitle={profile.title}>
        {children}
      </ProjectShell>
    );
  }, id);
}
