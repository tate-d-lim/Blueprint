import { SgdsButton, SgdsTable, SgdsTableCell, SgdsTableHead, SgdsTableRow } from "@govtechsg/sgds-web-component/react";
import { AppLink } from "@/app/components/app-link";
import { PageHeader } from "@/app/components/page-header";
import { RoleGate } from "@/app/components/role-gate";
import { Badge, SampleTag } from "@/app/plan/badge";
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
    <div className="sgds:mx-auto sgds:flex sgds:max-w-container-xl sgds:flex-col sgds:gap-layout-md">
      <PageHeader title="Tools and what they cover">
        Edit what each tool covers. Every save creates a new version that a verifier has to approve.
      </PageHeader>

      <SgdsTable>
        <SgdsTableRow>
          <SgdsTableHead>Tool</SgdsTableHead>
          <SgdsTableHead>Kind</SgdsTableHead>
          <SgdsTableHead>Coverage versions</SgdsTableHead>
          <SgdsTableHead>
            <span className="sgds:sr-only">Action</span>
          </SgdsTableHead>
        </SgdsTableRow>
        {data.tools.map(tool => {
          const pairs = data.versions.filter(v => v.current.toolId === tool._id);
          return (
            <SgdsTableRow key={tool._id}>
              <SgdsTableCell>
                <div className="sgds:flex sgds:flex-col sgds:gap-text-xs">
                  <div className="sgds:flex sgds:flex-wrap sgds:items-center sgds:gap-text-sm">
                    <strong>{tool.name}</strong> {tool.isSample && <SampleTag />}
                  </div>
                  <span className="sgds:text-body-sm sgds:text-subtle">{tool.description}</span>
                </div>
              </SgdsTableCell>
              <SgdsTableCell>{SECTION_TITLE[tool.section]}</SgdsTableCell>
              <SgdsTableCell>
                {pairs.length === 0 && <span className="sgds:text-subtle">None yet</span>}
                <ul className="sgds:flex sgds:flex-col sgds:gap-text-sm">
                  {pairs.map(p => (
                    <li key={p.current._id} className="sgds:flex sgds:flex-col sgds:gap-text-xs">
                      <span className="sgds:whitespace-nowrap">
                        {data.profiles.find(pr => pr._id === p.current.profileId)?.title} v{p.current.version}
                      </span>
                      <span className="sgds:flex sgds:items-center sgds:gap-text-sm sgds:whitespace-nowrap">
                        <Badge verification={versionVerification(p)} />
                        <span className="sgds:text-body-sm sgds:text-subtle">{p.current.createdAt.slice(0, 10)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </SgdsTableCell>
              <SgdsTableCell>
                <SgdsButton size="sm" variant="outline" href={`/admin/tools/${tool._id}`}>
                  Edit coverage
                </SgdsButton>
              </SgdsTableCell>
            </SgdsTableRow>
          );
        })}
      </SgdsTable>

      <p>
        <AppLink href="/admin/import">Import a Component Guide</AppLink>{" "}
        <span className="sgds:text-subtle">to create a version from a product team&apos;s published spreadsheet.</span>
      </p>

      <NewToolForm />
    </div>
  );
}
