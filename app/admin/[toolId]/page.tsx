import { notFound } from "next/navigation";
import { RoleGate } from "@/app/components/role-gate";
import { Note } from "@/app/ui/note";
import { PageHeader } from "@/app/ui/panel";
import { Tag } from "@/app/ui/stamp";
import { Breadcrumb, Cell, Table } from "@/app/ui/table";
import { diffSummary, diffVersions } from "@/lib/admin/diff";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { getCurrentVersion } from "@/lib/data/repos/tool-versions";
import type { CoverageEntry } from "@/lib/domain/types";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { defaultVerifyProfile } from "@/lib/plan/verification";
import { Decision } from "./decision";

type Props = { params: Promise<{ toolId: string }>; searchParams: Promise<{ profile?: string }> };

export default function ReviewPage(props: Props) {
  return (
    <RoleGate need="admin">
      <Review {...props} />
    </RoleGate>
  );
}

async function Review({ params, searchParams }: Props) {
  const { toolId } = await params;
  const { profile: chosen } = await searchParams;
  const { data, newest } = await withDb(async db => {
    const data = await loadPlanData(db);
    const profileId = chosen ?? defaultVerifyProfile(data.profiles, data.versions, toolId);
    return { data, newest: await getCurrentVersion(db, toolId, profileId) };
  });
  const tool = data.tools.find(t => t._id === toolId);
  const profile = data.profiles.find(p => p._id === newest?.profileId);
  // The page reviews the newest version in any state, so it can say that a version was approved or sent back.
  if (!tool || !profile || !newest) notFound();
  const current = newest;
  const lastApproved = data.versions.find(v => v.current.toolId === toolId && v.current.profileId === profile._id)?.lastApproved;
  // A version is compared with the newest approved one before it, never with itself.
  const base = lastApproved && lastApproved._id !== current._id ? lastApproved : undefined;

  const titleOf = (key: string) => profile.entries.find(e => e.key === key)?.title ?? key;
  const idOf = (key: string) => key.split(":")[1];
  const describe = (e: CoverageEntry) => {
    const checks = e.checks?.length ? `Checks: ${e.checks.map(c => `${c.id} (${c.kind})`).join(", ")}` : undefined;
    return [VALUE_LABEL(e.value, tool.name), e.explanation, e.builderPart && `App Builder's part: ${e.builderPart}`, checks].filter(Boolean).join(". ");
  };
  const diff = diffVersions(current, base);
  const decided = !!current.approval || !!current.sentBack;

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb items={[{ label: "Approvals", href: "/admin" }, { label: tool.name }]} />
      <PageHeader title={`${tool.name}, version ${current.version}`} />

      <dl className="grid max-w-page grid-cols-[max-content_1fr] gap-x-8 gap-y-2 border-y border-rule py-4 text-body">
        <Fact label="Profile">{profile.title}</Fact>
        <Fact label="Version">
          {current.version}, written against {current.writtenAgainst}
        </Fact>
        <Fact label="Saved">{current.createdAt.slice(0, 10)}</Fact>
        <Fact label="Source">
          <span className="flex flex-wrap items-center gap-2">
            {current.source}
            {current.importedFrom?.by === "coding-agent" && <Tag>Coding agent</Tag>}
          </span>
        </Fact>
        <Fact label="Change note">{current.changeNote ? `“${current.changeNote}”` : <span className="text-ink-soft">No note</span>}</Fact>
      </dl>

      {current.importedFrom?.by === "coding-agent" && (
        <Note>A coding agent filled this in from {current.importedFrom.fileName}. The tool owner reviewed it.</Note>
      )}

      {current.approval && (
        <Note tone="success" title="This version is approved.">
          Approved by {current.approval.by} on {current.approval.at.slice(0, 10)}.
        </Note>
      )}
      {current.sentBack && (
        <Note tone="attention" title="This version was sent back.">
          {current.sentBack.by} sent it back on {current.sentBack.at.slice(0, 10)}: &ldquo;{current.sentBack.note}&rdquo;
        </Note>
      )}

      {!current.approval && (
        <>
          <section aria-label="What changed" className="flex flex-col gap-4">
            <p className="text-lead text-ink-soft">
              {base ? `Compared with approved version ${base.version}: ` : "Nothing has been approved before, so every row is new: "}
              {diffSummary(diff)}.
            </p>
            {diff.added.length + diff.changed.length + diff.removed.length === 0 ? (
              <Note>No row differs from the approved version.</Note>
            ) : (
              <Table head={["Control", "Before", "Now"]}>
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
            )}
          </section>

          {!decided && <Decision versionId={current._id} toolName={tool.name} version={current.version} />}
        </>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-small font-semibold text-ink-soft">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Row({ id, title, kind, before, after }: { id: string; title: string; kind: "Added" | "Changed" | "Removed"; before: string; after: string }) {
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
