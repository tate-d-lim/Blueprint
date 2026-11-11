import { ButtonLink, TextLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { listProjects } from "@/lib/data/repos/projects";
import { DeleteProjectButton } from "./delete-project";

export default async function ProjectsPage() {
  const projects = await withDb(listProjects);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Projects" actions={<ButtonLink href="/start">Start a new plan</ButtonLink>}>
        Open a saved plan, or start a new one. Everyone here sees the same list.
      </PageHeader>
      {projects.length === 0 ? (
        <Note title="No saved plans yet">
          <TextLink href="/start">Start a new plan</TextLink>, then choose &ldquo;Save this plan&rdquo;. Its tasks show here.
        </Note>
      ) : (
        <Table head={["Project", "Owner", "Updated", <span key="actions" className="sr-only">Actions</span>]}>
          {projects.map(p => (
            <tr key={p._id}>
              <Cell>
                <TextLink href={`/projects/${p._id}`}>{p.name}</TextLink>
              </Cell>
              <Cell>{p.ownerName}</Cell>
              <Cell nowrap className="tnum">
                {p.updatedAt.slice(0, 10)}
              </Cell>
              <Cell nowrap className="text-right">
                <DeleteProjectButton projectId={p._id} projectName={p.name} look="row" />
              </Cell>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
