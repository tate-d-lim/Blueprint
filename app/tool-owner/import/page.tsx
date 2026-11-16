import { RoleGate } from "@/app/components/role-gate";
import { PageHeader } from "@/app/ui/panel";
import { Breadcrumb } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <RoleGate need="tool-owner">
      <ImportScreen />
    </RoleGate>
  );
}

async function ImportScreen() {
  const data = await withDb(loadPlanData);
  return (
    <div className="flex max-w-page flex-col gap-8">
      <Breadcrumb items={[{ label: "All tools", href: "/tool-owner" }, { label: "Import a Component Guide" }]} />
      <PageHeader title="Import a Component Guide">
        Upload the spreadsheet a product team publishes. It becomes a new, not-yet-verified version of that tool. Nothing is approved until a
        admin does it.
      </PageHeader>
      <ImportForm tools={data.tools.map(t => ({ id: t._id, name: t.name }))} profiles={data.profiles.map(p => ({ id: p._id, title: p.title }))} />
    </div>
  );
}
