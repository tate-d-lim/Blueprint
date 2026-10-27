import Link from "next/link";
import { Badge, SampleTag } from "@/app/plan/badge";
import { RoleGate } from "@/app/components/role-gate";
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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools and what they cover</h1>
        <p className="mt-1 text-muted">
          Edit what each tool covers. Every save creates a new version that a verifier has to approve.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Tool</th>
              <th className="px-4 py-3 font-medium">Kind</th>
              <th className="px-4 py-3 font-medium">Coverage versions</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.tools.map(tool => {
              const pairs = data.versions.filter(v => v.current.toolId === tool._id);
              return (
                <tr key={tool._id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      {tool.name} {tool.isSample && <SampleTag />}
                    </div>
                    <div className="text-muted">{tool.description}</div>
                  </td>
                  <td className="px-4 py-3 text-muted">{SECTION_TITLE[tool.section]}</td>
                  <td className="px-4 py-3">
                    {pairs.length === 0 && <span className="text-muted">None yet</span>}
                    <ul className="space-y-1">
                      {pairs.map(p => (
                        <li key={p.current._id} className="flex flex-wrap items-center gap-2">
                          <span>
                            {data.profiles.find(pr => pr._id === p.current.profileId)?.title} v{p.current.version}
                          </span>
                          <Badge verification={versionVerification(p)} />
                          <span className="text-muted">{p.current.createdAt.slice(0, 10)}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/tools/${tool._id}`} className="font-medium text-accent hover:underline">
                      Edit coverage
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <NewToolForm />
    </div>
  );
}
