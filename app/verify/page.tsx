import { SgdsAlert, SgdsButton, SgdsTable, SgdsTableCell, SgdsTableHead, SgdsTableRow } from "@govtechsg/sgds-web-component/react";
import { PageHeader } from "@/app/components/page-header";
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
    <div className="sgds:mx-auto sgds:flex sgds:max-w-container-xl sgds:flex-col sgds:gap-layout-md">
      <PageHeader title="Waiting for approval">Check what changed, then approve. Builders see the badge flip straight away.</PageHeader>
      {awaiting.length === 0 ? (
        <SgdsAlert show outlined variant="info">
          Nothing is waiting for approval.
        </SgdsAlert>
      ) : (
        <SgdsTable>
          <SgdsTableRow>
            <SgdsTableHead>Tool</SgdsTableHead>
            <SgdsTableHead>Version</SgdsTableHead>
            <SgdsTableHead>Saved</SgdsTableHead>
            <SgdsTableHead>What changed</SgdsTableHead>
            <SgdsTableHead>Source</SgdsTableHead>
            <SgdsTableHead>
              <span className="sgds:sr-only">Action</span>
            </SgdsTableHead>
          </SgdsTableRow>
          {awaiting.map(({ tool, current }) => (
            <SgdsTableRow key={current._id}>
              <SgdsTableCell>
                <strong>{tool.name}</strong>
              </SgdsTableCell>
              <SgdsTableCell>
                <span className="sgds:whitespace-nowrap">
                  {profiles.find(p => p._id === current.profileId)?.title} · version {current.version}
                </span>
              </SgdsTableCell>
              <SgdsTableCell>
                <span className="sgds:whitespace-nowrap">{current.createdAt.slice(0, 10)}</span>
              </SgdsTableCell>
              <SgdsTableCell>{current.changeNote ? `“${current.changeNote}”` : "No note"}</SgdsTableCell>
              <SgdsTableCell>{current.source}</SgdsTableCell>
              <SgdsTableCell>
                <SgdsButton size="sm" variant="outline" href={`/verify/${tool._id}?profile=${current.profileId}`}>
                  Review
                </SgdsButton>
              </SgdsTableCell>
            </SgdsTableRow>
          ))}
        </SgdsTable>
      )}
    </div>
  );
}
