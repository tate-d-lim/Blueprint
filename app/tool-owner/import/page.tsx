import { RoleGate } from "@/app/components/role-gate";
import { PageHeader } from "@/app/ui/panel";
import { Breadcrumb } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { ImportForm } from "./import-form";

type Props = { searchParams: Promise<{ tool?: string; profile?: string }> };

export default function ImportPage(props: Props) {
  return (
    <RoleGate need="tool-owner">
      <ImportScreen {...props} />
    </RoleGate>
  );
}

async function ImportScreen({ searchParams }: Props) {
  const { tool, profile } = await searchParams;
  const data = await withDb(loadPlanData);
  return (
    <div className="flex max-w-page flex-col gap-8">
      <Breadcrumb items={[{ label: "All tools", href: "/tool-owner" }, { label: "Import a Component Guide" }]} />
      <PageHeader title="Import a Component Guide">
        Upload the spreadsheet a product team publishes. It becomes a new, not-yet-verified version of that tool. Nothing is approved until an
        admin does it.
      </PageHeader>
      <ImportForm initialTool={tool} initialProfile={profile} tools={data.tools.map(t => ({ id: t._id, name: t.name }))} profiles={data.profiles.map(p => ({ id: p._id, title: p.title }))} />
    </div>
  );
}
