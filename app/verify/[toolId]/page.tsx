import { SgdsAlert, SgdsBadge, SgdsBreadcrumb, SgdsBreadcrumbItem, SgdsTable, SgdsTableCell, SgdsTableHead, SgdsTableRow } from "@govtechsg/sgds-web-component/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/app/components/page-header";
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
    <div className="sgds:mx-auto sgds:flex sgds:max-w-container-xl sgds:flex-col sgds:gap-layout-md">
      <div className="sgds:flex sgds:flex-col sgds:gap-sm">
        <SgdsBreadcrumb>
          <SgdsBreadcrumbItem>
            <Link href="/verify" suppressHydrationWarning>
              Waiting for approval
            </Link>
          </SgdsBreadcrumbItem>
          <SgdsBreadcrumbItem active>{tool.name}</SgdsBreadcrumbItem>
        </SgdsBreadcrumb>
        <PageHeader title={`${tool.name}, version ${current.version}`}>
          {profile.title} · saved {current.createdAt.slice(0, 10)} · written against {current.writtenAgainst} · Source: {current.source}
        </PageHeader>
        {current.changeNote && (
          <SgdsAlert show outlined variant="info">
            What changed: {current.changeNote}
          </SgdsAlert>
        )}
      </div>

      {current.approval ? (
        <SgdsAlert show outlined variant="success">
          This version is already approved ({current.approval.by}, {current.approval.at.slice(0, 10)}).
        </SgdsAlert>
      ) : (
        <>
          <p className="sgds:text-subtle">
            {lastApproved ? `Compared with approved version ${lastApproved.version}: ` : "Nothing has been approved before, so every row is new: "}
            {diff.added.length} added, {diff.changed.length} changed, {diff.removed.length} removed.
          </p>

          <SgdsTable>
            <SgdsTableRow>
              <SgdsTableHead>Requirement</SgdsTableHead>
              <SgdsTableHead>Before</SgdsTableHead>
              <SgdsTableHead>Now</SgdsTableHead>
            </SgdsTableRow>
            {diff.added.map(e => (
              <Row key={e.key} id={idOf(e.key)} title={titleOf(e.key)} kind="Added" before="—" after={describe(e)} />
            ))}
            {diff.changed.map(c => (
              <Row key={c.after.key} id={idOf(c.after.key)} title={titleOf(c.after.key)} kind="Changed" before={describe(c.before)} after={describe(c.after)} />
            ))}
            {diff.removed.map(e => (
              <Row key={e.key} id={idOf(e.key)} title={titleOf(e.key)} kind="Removed" before={describe(e)} after="—" />
            ))}
          </SgdsTable>

          <ApproveButton versionId={current._id} />
        </>
      )}
    </div>
  );
}

const KIND_VARIANT = { Added: "success", Changed: "warning", Removed: "danger" } as const;

function Row({ id, title, kind, before, after }: { id: string; title: string; kind: keyof typeof KIND_VARIANT; before: string; after: string }) {
  return (
    <SgdsTableRow>
      <SgdsTableCell>
        <div className="sgds:flex sgds:flex-col sgds:gap-text-xs">
          <strong>{title}</strong>
          <span className="sgds:flex sgds:items-center sgds:gap-text-sm">
            <span className="sgds:font-code sgds:text-caption-md sgds:text-subtle">{id}</span>
            <SgdsBadge show variant={KIND_VARIANT[kind]}>
              {kind}
            </SgdsBadge>
          </span>
        </div>
      </SgdsTableCell>
      <SgdsTableCell>
        <span className="sgds:text-subtle">{before}</span>
      </SgdsTableCell>
      <SgdsTableCell>{after}</SgdsTableCell>
    </SgdsTableRow>
  );
}
