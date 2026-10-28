import { TitleCell } from "@/app/ui/title-cell";
import { withDb } from "@/lib/data/db";
import { getProject } from "@/lib/data/repos/projects";

/** A saved project's own cells in the title block: what this drawing is, whose it is, and when it last changed. */
export default async function ProjectCells({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The page itself reports a missing project or a stopped database; the title block just leaves the cells out.
  const project = await withDb(db => getProject(db, id)).catch(() => null);
  if (!project) return null;
  return (
    <>
      <TitleCell label="Project">
        <span className="font-display text-lead leading-tight font-semibold">{project.name}</span>
      </TitleCell>
      <TitleCell label="Owner">
        <span className="text-body">{project.ownerName}</span>
      </TitleCell>
      <TitleCell label="Revised">
        <span className="tnum text-body">{project.updatedAt.slice(0, 10)}</span>
      </TitleCell>
    </>
  );
}
