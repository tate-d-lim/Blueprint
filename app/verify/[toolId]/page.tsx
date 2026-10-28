import { notFound } from "next/navigation";
import { RoleGate } from "@/app/components/role-gate";
import { Note } from "@/app/ui/note";
import { PageHeader } from "@/app/ui/panel";
import { Tag } from "@/app/ui/stamp";
import { Breadcrumb, Cell, Table } from "@/app/ui/table";
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
    return [VALUE_LABEL(e.value, tool.name, other), e.explanation, e.builderPart && `App Builder's part: ${e.builderPart}`].filter(Boolean).join(". ");
  };
  const diff = diffVersions(current, lastApproved);

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb items={[{ label: "Waiting for approval", href: "/verify" }, { label: tool.name }]} />
      <PageHeader title={`${tool.name}, version ${current.version}`}>
        {profile.title}, saved {current.createdAt.slice(0, 10)}, written against {current.writtenAgainst}. Source: {current.source}
      </PageHeader>
      {current.changeNote && <Note title="What changed">{current.changeNote}</Note>}

      {current.approval ? (
        <Note tone="success" title="This version is already approved.">
          Approved by {current.approval.by} on {current.approval.at.slice(0, 10)}.
        </Note>
      ) : (
        <>
          <p className="text-lead text-ink-soft">
            {lastApproved ? `Compared with approved version ${lastApproved.version}: ` : "Nothing has been approved before, so every row is new: "}
            {diff.added.length} added, {diff.changed.length} changed, {diff.removed.length} removed.
          </p>

          <Table head={["Requirement", "Before", "Now"]}>
            {diff.added.map(e => (
              <Row key={e.key} id={idOf(e.key)} title={titleOf(e.key)} kind="Added" before="Nothing" after={describe(e)} />
            ))}
            {diff.changed.map(c => (
              <Row key={c.after.key} id={idOf(c.after.key)} title={titleOf(c.after.key)} kind="Changed" before={describe(c.before)} after={describe(c.after)} />
            ))}
            {diff.removed.map(e => (
              <Row key={e.key} id={idOf(e.key)} title={titleOf(e.key)} kind="Removed" before={describe(e)} after="Nothing" />
            ))}
          </Table>

          <ApproveButton versionId={current._id} />
        </>
      )}
    </div>
  );
}

function Row({ id, title, kind, before, after }: { id: string; title: string; kind: string; before: string; after: string }) {
  return (
    <tr>
      <Cell className="w-[30%]">
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold">{title}</span>
          <span className="flex items-center gap-2">
            <span className="tnum text-small text-ink-soft">{id}</span>
            <Tag>{kind}</Tag>
          </span>
        </div>
      </Cell>
      <Cell>
        <span className="text-ink-soft">{before}</span>
      </Cell>
      <Cell>{after}</Cell>
    </tr>
  );
}
