import { RoleGate } from "@/app/components/role-gate";
import { Badge, SampleTag } from "@/app/plan/badge";
import { ButtonLink, TextLink } from "@/app/ui/button";
import { PageHeader } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { versionVerification } from "@/lib/plan/verification";
import { NewToolForm } from "./new-tool-form";

const SECTION_TITLE = { cpf: "CPF tool", wog: "Whole-of-government tool", code: "Code component" } as const;

export default function AdminPage() {
  return (
    <RoleGate need="admin">
      <AdminTools />
    </RoleGate>
  );
}

async function AdminTools() {
  const data = await withDb(loadPlanData);
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Tools and what they cover" actions={<ButtonLink href="/admin/import" variant="secondary">Import a Component Guide</ButtonLink>}>
        Edit what each tool covers. Every save creates a new version that a verifier has to approve.
      </PageHeader>

      <Table head={["Tool", "Kind", "Coverage versions", <span key="a" className="sr-only">Action</span>]}>
        {data.tools.map(tool => {
          const pairs = data.versions.filter(v => v.current.toolId === tool._id);
          return (
            <tr key={tool._id}>
              <Cell>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lead font-semibold">{tool.name}</span>
                    {tool.isSample && <SampleTag />}
                  </span>
                  <span className="text-small text-ink-soft">{tool.description}</span>
                </div>
              </Cell>
              <Cell nowrap>{SECTION_TITLE[tool.section]}</Cell>
              <Cell>
                {pairs.length === 0 && <span className="text-ink-soft">None yet</span>}
                <ul className="flex flex-col gap-2">
                  {pairs.map(p => (
                    <li key={p.current._id} className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">
                        {data.profiles.find(pr => pr._id === p.current.profileId)?.title}, version {p.current.version}
                      </span>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Badge verification={versionVerification(p)} />
                        <span className="tnum text-small text-ink-soft">{p.current.createdAt.slice(0, 10)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Cell>
              <Cell nowrap className="text-right">
                <ButtonLink href={`/admin/tools/${tool._id}`} variant="secondary" size="sm">
                  Edit coverage
                </ButtonLink>
              </Cell>
            </tr>
          );
        })}
      </Table>

      <p className="text-ink-soft">
        A product team publishes its own coverage? <TextLink href="/admin/import">Import its Component Guide</TextLink> to create a version from
        the spreadsheet.
      </p>

      <NewToolForm />
    </div>
  );
}
