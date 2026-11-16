import { RoleGate } from "@/app/components/role-gate";
import { ButtonLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader, SectionHeading } from "@/app/ui/panel";
import { Stamp, Tag } from "@/app/ui/stamp";
import { Cell, Table } from "@/app/ui/table";
import { diffSummary, diffVersions } from "@/lib/admin/diff";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { listAwaitingApproval, listDecisions } from "@/lib/data/repos/tool-versions";
import { dayOf } from "@/lib/dates";

type Props = { searchParams: Promise<{ done?: string; tool?: string; version?: string }> };

export default function ApprovalsPage(props: Props) {
  return (
    <RoleGate need="admin">
      <Approvals {...props} />
    </RoleGate>
  );
}

async function Approvals({ searchParams }: Props) {
  const { done, tool: doneTool, version: doneVersion } = await searchParams;
  const { awaiting, decisions, data } = await withDb(async db => ({
    awaiting: await listAwaitingApproval(db),
    decisions: await listDecisions(db, 10),
    data: await loadPlanData(db),
  }));
  const profileTitle = (id: string) => data.profiles.find(p => p._id === id)?.title ?? id;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Approvals">
        Check what changed in each new version, then approve it or send it back. Builders see a version as Verified after you approve it.
      </PageHeader>

      {(done === "approved" || done === "sent-back") && doneTool && (
        <Note tone="success" role="status" title={`${doneTool}, version ${doneVersion ?? ""}, ${done === "approved" ? "is approved." : "is sent back."}`}>
          {done === "approved" ? "Builders now see it as Verified." : "The tool owner sees your note on the tool page. Builders do not see this version."}
        </Note>
      )}

      <section aria-label="Waiting for approval" className="flex flex-col gap-4">
        <SectionHeading title="Waiting for approval" count={awaiting.length} />
        {awaiting.length === 0 ? (
          <Note title="No versions are waiting.">A version appears here when a tool owner saves or imports a new one.</Note>
        ) : (
          <Table head={["Tool", "Profile and version", "Saved", "Change note", "Source", "Size of the change", <span key="a" className="sr-only">Action</span>]}>
            {awaiting.map(({ tool, current }) => {
              const pair = data.versions.find(v => v.current.toolId === tool._id && v.current.profileId === current.profileId);
              const diff = diffVersions(current, pair?.lastApproved);
              return (
                <tr key={current._id}>
                  <Cell>
                    <span className="text-lead font-semibold">{tool.name}</span>
                  </Cell>
                  <Cell nowrap>
                    {profileTitle(current.profileId)}, version {current.version}
                  </Cell>
                  <Cell nowrap className="tnum">
                    {dayOf(current.createdAt)}
                  </Cell>
                  <Cell className="max-w-72">{current.changeNote ? `“${current.changeNote}”` : <span className="text-ink-soft">No note</span>}</Cell>
                  <Cell>
                    <span className="flex flex-col items-start gap-1">
                      {current.source}
                      {current.importedFrom?.by === "coding-agent" && <Tag>Coding agent</Tag>}
                    </span>
                  </Cell>
                  <Cell nowrap className="tnum">
                    {diffSummary(diff)}
                  </Cell>
                  <Cell nowrap className="text-right">
                    <ButtonLink href={`/admin/${tool._id}?profile=${current.profileId}`} variant="secondary" size="sm">
                      Review
                    </ButtonLink>
                  </Cell>
                </tr>
              );
            })}
          </Table>
        )}
      </section>

      <section aria-label="Decided" className="flex flex-col gap-4">
        <SectionHeading title="Decided">A person checks each version before builders see it as Verified. These are the last decisions.</SectionHeading>
        {decisions.length === 0 ? (
          <Note>No decisions yet. Approved and sent back versions appear here.</Note>
        ) : (
          <Table head={["Decision", "Tool", "Profile and version", "Decided by", "Date", "Note"]}>
            {decisions.map(({ tool, version, decision }) => (
              <tr key={version._id}>
                <Cell nowrap>{decision.kind === "approved" ? <Stamp tone="approved">Approved</Stamp> : <Stamp tone="pending">Sent back</Stamp>}</Cell>
                <Cell>
                  <span className="font-semibold">{tool.name}</span>
                </Cell>
                <Cell nowrap>
                  {profileTitle(version.profileId)}, version {version.version}
                </Cell>
                <Cell nowrap>{decision.by}</Cell>
                <Cell nowrap className="tnum">
                  {dayOf(decision.at)}
                </Cell>
                <Cell className="max-w-96">{decision.note ? `“${decision.note}”` : <span className="text-ink-soft">No note</span>}</Cell>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
