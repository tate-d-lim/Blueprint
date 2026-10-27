import Link from "next/link";
import { RoleGate } from "@/app/components/role-gate";
import { withDb } from "@/lib/data/db";
import { listAwaitingApproval } from "@/lib/data/repos/tool-versions";
import type { Profile } from "@/lib/domain/types";

export default function VerifyPage() {
  return (
    <RoleGate need="verifier">
      <Awaiting />
    </RoleGate>
  );
}

async function Awaiting() {
  const { awaiting, profiles } = await withDb(async db => ({
    awaiting: await listAwaitingApproval(db),
    profiles: (await db.collection("profiles").find().toArray()) as unknown as Profile[],
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Waiting for approval</h1>
        <p className="mt-1 text-muted">Check what changed, then approve. Builders see the badge flip straight away.</p>
      </div>
      {awaiting.length === 0 && <p className="rounded-xl border border-line bg-surface p-5">Nothing is waiting for approval.</p>}
      <ul className="space-y-3">
        {awaiting.map(({ tool, current }) => (
          <li key={current._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface p-4">
            <div>
              <div className="font-medium">
                {tool.name} <span className="font-normal text-muted">· {profiles.find(p => p._id === current.profileId)?.title} · version {current.version}</span>
              </div>
              <div className="text-sm text-muted">
                Saved {current.createdAt.slice(0, 10)} · {current.changeNote ? `“${current.changeNote}”` : "no note"} · Source: {current.source}
              </div>
            </div>
            <Link href={`/verify/${tool._id}?profile=${current.profileId}`} className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft">
              Review
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
