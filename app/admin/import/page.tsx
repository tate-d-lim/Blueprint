import { SgdsBreadcrumb, SgdsBreadcrumbItem } from "@govtechsg/sgds-web-component/react";
import Link from "next/link";
import { PageHeader } from "@/app/components/page-header";
import { RoleGate } from "@/app/components/role-gate";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <RoleGate need="admin">
      <ImportScreen />
    </RoleGate>
  );
}

async function ImportScreen() {
  const data = await withDb(loadPlanData);
  return (
    <div className="sgds:mx-auto sgds:flex sgds:max-w-container-lg sgds:flex-col sgds:gap-layout-md">
      <div className="sgds:flex sgds:flex-col sgds:gap-sm">
        <SgdsBreadcrumb>
          <SgdsBreadcrumbItem>
            <Link href="/admin" suppressHydrationWarning>
              All tools
            </Link>
          </SgdsBreadcrumbItem>
          <SgdsBreadcrumbItem active>Import a Component Guide</SgdsBreadcrumbItem>
        </SgdsBreadcrumb>
        <PageHeader title="Import a Component Guide">
          Upload the spreadsheet a product team publishes (the Component Guide format). It becomes a new, not-yet-verified version of that
          tool. Nothing is approved until a verifier does it.
        </PageHeader>
      </div>
      <ImportForm
        tools={data.tools.map(t => ({ id: t._id, name: t.name }))}
        profiles={data.profiles.map(p => ({ id: p._id, title: p.title }))}
      />
    </div>
  );
}
