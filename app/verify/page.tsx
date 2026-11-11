import { RoleGate } from "@/app/components/role-gate";
import { ButtonLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader } from "@/app/ui/panel";
import { Cell, Table } from "@/app/ui/table";
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
    <div className="flex flex-col gap-8">
      <PageHeader title="Waiting for approval">Check what changed, then approve. Builders see the new stamp at once.</PageHeader>
      {awaiting.length === 0 ? (
        <Note title="Nothing is waiting for approval.">New versions appear here when an admin saves or imports one.</Note>
      ) : (
        <Table head={["Tool", "Version", "Saved", "What changed", "Source", <span key="a" className="sr-only">Action</span>]}>
          {awaiting.map(({ tool, current }) => (
            <tr key={current._id}>
              <Cell>
                <span className="text-lead font-semibold">{tool.name}</span>
              </Cell>
              <Cell nowrap>
                {profiles.find(p => p._id === current.profileId)?.title}, version {current.version}
              </Cell>
              <Cell nowrap className="tnum">
                {current.createdAt.slice(0, 10)}
              </Cell>
              <Cell>{current.changeNote ? `“${current.changeNote}”` : <span className="text-ink-soft">No note</span>}</Cell>
              <Cell>{current.source}</Cell>
              <Cell nowrap className="text-right">
                <ButtonLink href={`/verify/${tool._id}?profile=${current.profileId}`} variant="secondary" size="sm">
                  Review
                </ButtonLink>
              </Cell>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
