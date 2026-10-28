import { notFound } from "next/navigation";
import { PlanView } from "@/app/plan/plan-view";
import { Breadcrumb } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { getProject } from "@/lib/data/repos/projects";

// The project's name, owner and revision date are in the title block (app/@titlecells/projects/[id]).
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, data } = await withDb(async db => ({ project: await getProject(db, id), data: await loadPlanData(db) }));
  if (!project) notFound();
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Saved projects", href: "/projects" }, { label: project.name }]} />
      <PlanView data={data} answers={project.riskAnswers} initialToolIds={project.toolIds} project={project} />
    </div>
  );
}
