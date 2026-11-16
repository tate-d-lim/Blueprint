import { RoleGate } from "@/app/components/role-gate";
import { SampleTag, StatusMark } from "@/app/plan/badge";
import { ButtonLink } from "@/app/ui/button";
import { PageHeader } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { listNewestVersions } from "@/lib/data/repos/tool-versions";
import { coverageToCheck } from "@/lib/catalog/news";
import { coverageStatus } from "@/lib/tool-owner/status";
import { AddTool } from "./new-tool-form";

const SECTION_TITLE = { cpf: "CPF tool", wog: "Whole-of-government tool", code: "Code component" } as const;

export default function ToolOwnerPage() {
  return (
    <RoleGate need="tool-owner">
      <ToolOwnerTools />
    </RoleGate>
  );
}

async function ToolOwnerTools() {
  const { data, newest } = await withDb(async db => ({ data: await loadPlanData(db), newest: await listNewestVersions(db) }));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Tools and what they cover"
        actions={
          <>
            <ButtonLink href="/tool-owner/import" variant="secondary">
              Import a Component Guide
            </ButtonLink>
            <AddTool />
          </>
        }
      >
        Record what each tool covers. Each save makes a new version, and an admin approves it.
      </PageHeader>

      <Table head={["Tool", "Kind", "Coverage versions", <span key="a" className="sr-only">Action</span>]}>
        {data.tools.map(tool => {
          const versions = newest.filter(v => v.toolId === tool._id);
          return (
            <tr key={tool._id}>
              <Cell>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-lead font-semibold">{tool.name}</span>
                    {tool.isSample && <SampleTag />}
                  </span>
                  <span className="text-small text-ink-soft">{tool.description}</span>
                </div>
              </Cell>
              <Cell nowrap>{SECTION_TITLE[tool.section]}</Cell>
              <Cell>
                {versions.length === 0 && <StatusMark status={coverageStatus(undefined)} />}
                <ul className="flex flex-col gap-2">
                  {versions.map(v => {
                    // After a catalog release, an approved version shows how many of its rows to read again.
                    const toCheck = coverageToCheck(v, data.releases ?? []);
                    const status = coverageStatus(v, { rowsToCheck: toCheck.reworded.length + toCheck.added.length });
                    return (
                      <li key={v._id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="whitespace-nowrap">
                          {data.profiles.find(pr => pr._id === v.profileId)?.title}, version {v.version}
                        </span>
                        <StatusMark status={status} />
                        {(status.kind === "verified" || status.kind === "govtech-published") && (
                          <span className="tnum text-small text-ink-soft">{status.at.slice(0, 10)}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Cell>
              <Cell nowrap className="text-right">
                <ButtonLink href={`/tool-owner/tools/${tool._id}`} variant="secondary" size="sm">
                  Edit coverage
                </ButtonLink>
              </Cell>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
