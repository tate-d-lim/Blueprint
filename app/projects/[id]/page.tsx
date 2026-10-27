import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanView } from "@/app/plan/plan-view";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { getProject } from "@/lib/data/repos/projects";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project, data } = await withDb(async db => ({ project: await getProject(db, id), data: await loadPlanData(db) }));
  if (!project) notFound();
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted">
        <Link href="/projects" className="hover:underline">
          ← Saved projects
        </Link>{" "}
        · {project.name} · Owner: {project.ownerName} · Updated {project.updatedAt.slice(0, 10)}
      </div>
      <PlanView data={data} answers={project.riskAnswers} initialToolIds={project.toolIds} project={project} />
    </div>
  );
}
