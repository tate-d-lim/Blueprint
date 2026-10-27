import Link from "next/link";
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
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:underline">
          ← All tools
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Import a Component Guide</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Upload the spreadsheet a product team publishes (the Component Guide format). It becomes a new, not-yet-verified version of that
          tool. Nothing is approved until a verifier does it.
        </p>
      </div>
      <ImportForm
        tools={data.tools.map(t => ({ id: t._id, name: t.name }))}
        profiles={data.profiles.map(p => ({ id: p._id, title: p.title }))}
      />
    </div>
  );
}
