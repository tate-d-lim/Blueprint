import { SgdsAlert, SgdsTable, SgdsTableCell, SgdsTableHead, SgdsTableRow } from "@govtechsg/sgds-web-component/react";
import { AppLink } from "@/app/components/app-link";
import { PageHeader } from "@/app/components/page-header";
import { withDb } from "@/lib/data/db";
import { listProjects } from "@/lib/data/repos/projects";

export default async function ProjectsPage() {
  const projects = await withDb(listProjects);
  return (
    <div className="sgds:mx-auto sgds:flex sgds:max-w-container-lg sgds:flex-col sgds:gap-layout-md">
      <PageHeader title="Saved projects">Pick up a plan where you left off. Everyone here shares one list.</PageHeader>
      {projects.length === 0 ? (
        <SgdsAlert show outlined variant="info">
          Nothing saved yet. <AppLink href="/start">Start a plan</AppLink>, then choose &ldquo;Save this plan&rdquo;.
        </SgdsAlert>
      ) : (
        <SgdsTable>
          <SgdsTableRow>
            <SgdsTableHead>Project</SgdsTableHead>
            <SgdsTableHead>Owner</SgdsTableHead>
            <SgdsTableHead>Updated</SgdsTableHead>
          </SgdsTableRow>
          {projects.map(p => (
            <SgdsTableRow key={p._id}>
              <SgdsTableCell>
                <AppLink href={`/projects/${p._id}`}>{p.name}</AppLink>
              </SgdsTableCell>
              <SgdsTableCell>{p.ownerName}</SgdsTableCell>
              <SgdsTableCell>{p.updatedAt.slice(0, 10)}</SgdsTableCell>
            </SgdsTableRow>
          ))}
        </SgdsTable>
      )}
    </div>
  );
}
