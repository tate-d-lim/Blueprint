import { ButtonLink, TextLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { listProjects } from "@/lib/data/repos/projects";

export default async function ProjectsPage() {
  const projects = await withDb(listProjects);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Saved projects" actions={<ButtonLink href="/start" variant="secondary">Start a new plan</ButtonLink>}>
        Pick up a plan where you left off. Everyone here shares one list.
      </PageHeader>
      {projects.length === 0 ? (
        <Note title="Nothing saved yet">
          <TextLink href="/start">Start a plan</TextLink>, then choose &ldquo;Save this plan&rdquo; to track its tasks here.
        </Note>
      ) : (
        <Table head={["Project", "Owner", "Updated"]}>
          {projects.map(p => (
            <tr key={p._id}>
              <Cell>
                <TextLink href={`/projects/${p._id}`}>{p.name}</TextLink>
              </Cell>
              <Cell>{p.ownerName}</Cell>
              <Cell nowrap className="tnum">
                {p.updatedAt.slice(0, 10)}
              </Cell>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
