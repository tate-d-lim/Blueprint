import { SgdsBreadcrumb, SgdsBreadcrumbItem } from "@govtechsg/sgds-web-component/react";
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
    <div className="sgds:flex sgds:flex-col sgds:gap-layout-sm">
      <div className="sgds:flex sgds:flex-col sgds:gap-text-xs">
        <SgdsBreadcrumb>
          <SgdsBreadcrumbItem>
            <Link href="/projects" suppressHydrationWarning>
              Saved projects
            </Link>
          </SgdsBreadcrumbItem>
          <SgdsBreadcrumbItem active>{project.name}</SgdsBreadcrumbItem>
        </SgdsBreadcrumb>
        <p className="sgds:text-body-sm sgds:text-subtle">
          Owner: {project.ownerName} · Updated {project.updatedAt.slice(0, 10)}
        </p>
      </div>
      <PlanView data={data} answers={project.riskAnswers} initialToolIds={project.toolIds} project={project} />
    </div>
  );
}
