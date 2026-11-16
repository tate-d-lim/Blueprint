import { RoleGate } from "@/app/components/role-gate";
import { PageHeader } from "@/app/ui/panel";
import { Breadcrumb } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import type { Profile } from "@/lib/domain/types";
import { UploadForm } from "./upload-form";

export default function UploadPage() {
  return (
    <RoleGate need="admin">
      <Upload />
    </RoleGate>
  );
}

async function Upload() {
  const profiles = await withDb(async db => (await db.collection("profiles").find().toArray()) as unknown as Profile[]);
  return (
    <div className="flex max-w-page flex-col gap-8">
      <Breadcrumb items={[{ label: "Catalog", href: "/admin/catalog" }, { label: "Upload a release" }]} />
      <PageHeader title="Upload a release">
        Choose a file with the new IM8 controls. Blueprint reads it and shows what changes. Nothing changes until you apply it.
      </PageHeader>
      <UploadForm profiles={profiles.map(p => ({ id: p._id, title: p.title }))} />
    </div>
  );
}
