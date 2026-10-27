import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleGate } from "@/app/components/role-gate";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import type { CoverageEntry } from "@/lib/domain/types";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { diffVersions } from "@/lib/verify/diff";
import { ApproveButton } from "./approve-button";

type Props = { params: Promise<{ toolId: string }>; searchParams: Promise<{ profile?: string }> };

export default function ReviewPage(props: Props) {
  return (
    <RoleGate need="verifier">
      <Review {...props} />
    </RoleGate>
  );
}

async function Review({ params, searchParams }: Props) {
  const { toolId } = await params;
  const { profile: profileId = "low-risk-cloud" } = await searchParams;
  const data = await withDb(loadPlanData);
  const tool = data.tools.find(t => t._id === toolId);
  const profile = data.profiles.find(p => p._id === profileId);
  const pair = data.versions.find(v => v.current.toolId === toolId && v.current.profileId === profileId);
  if (!tool || !profile || !pair) notFound();

  const { current, lastApproved } = pair;
  const titleOf = (key: string) => profile.entries.find(e => e.key === key)?.title ?? key;
  const idOf = (key: string) => key.split(":")[1];
  const describe = (e: CoverageEntry) => {
    const other = e.otherToolId ? data.tools.find(t => t._id === e.otherToolId)?.name : undefined;
    return [VALUE_LABEL(e.value, tool.name, other), e.explanation, e.builderPart && `App Builder's part: ${e.builderPart}`].filter(Boolean).join(" — ");
  };
  const diff = diffVersions(current, lastApproved);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/verify" className="text-sm text-muted hover:underline">
          ← Waiting for approval
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {tool.name}, version {current.version}
        </h1>
        <p className="mt-1 text-muted">
          {profile.title} · saved {current.createdAt.slice(0, 10)} · written against {current.writtenAgainst} · Source: {current.source}
        </p>
        {current.changeNote && <p className="mt-2 rounded-lg bg-accent-soft px-4 py-3 text-sm">What changed: {current.changeNote}</p>}
      </div>

      {current.approval ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm">
          This version is already approved ({current.approval.by}, {current.approval.at.slice(0, 10)}).
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {lastApproved ? `Compared with approved version ${lastApproved.version}: ` : "Nothing has been approved before, so every row is new: "}
            {diff.added.length} added, {diff.changed.length} changed, {diff.removed.length} removed.
          </p>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Requirement</th>
                  <th className="px-4 py-2 font-medium">Before</th>
                  <th className="px-4 py-2 font-medium">Now</th>
                </tr>
              </thead>
              <tbody>
                {diff.added.map(e => (
                  <Row key={e.key} id={idOf(e.key)} title={titleOf(e.key)} kind="Added" before="—" after={describe(e)} />
                ))}
                {diff.changed.map(c => (
                  <Row key={c.after.key} id={idOf(c.after.key)} title={titleOf(c.after.key)} kind="Changed" before={describe(c.before)} after={describe(c.after)} />
                ))}
                {diff.removed.map(e => (
                  <Row key={e.key} id={idOf(e.key)} title={titleOf(e.key)} kind="Removed" before={describe(e)} after="—" />
                ))}
              </tbody>
            </table>
          </div>

          <ApproveButton versionId={current._id} />
        </>
      )}
    </div>
  );
}

function Row({ id, title, kind, before, after }: { id: string; title: string; kind: string; before: string; after: string }) {
  return (
    <tr className="border-b border-line align-top last:border-0">
      <td className="w-72 px-4 py-2">
        <div className="font-medium">{title}</div>
        <div className="font-mono text-xs text-muted">
          {id} · {kind}
        </div>
      </td>
      <td className="px-4 py-2 text-muted">{before}</td>
      <td className="px-4 py-2">{after}</td>
    </tr>
  );
}
