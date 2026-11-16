import { notFound } from "next/navigation";
import { RoleGate } from "@/app/components/role-gate";
import { StatusMark } from "@/app/plan/badge";
import { TextLink } from "@/app/ui/button";
import { Note } from "@/app/ui/note";
import { PageHeader } from "@/app/ui/panel";
import { Breadcrumb } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import { listNewestVersions } from "@/lib/data/repos/tool-versions";
import { coverageStatus } from "@/lib/tool-owner/status";
import type { DraftRow } from "@/lib/tool-owner/new-version";
import { CoverageEditor } from "./coverage-editor";

type Props = {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ profile?: string }>;
};

export default function ToolPage(props: Props) {
  return (
    <RoleGate need="tool-owner">
      <ToolEditor {...props} />
    </RoleGate>
  );
}

async function ToolEditor({ params, searchParams }: Props) {
  const { toolId } = await params;
  const { profile: wanted } = await searchParams;
  const { data, newest } = await withDb(async db => ({ data: await loadPlanData(db), newest: await listNewestVersions(db) }));
  const tool = data.tools.find(t => t._id === toolId);
  if (!tool) notFound();

  // The tool owner edits from the newest version in any state, including one the admin sent back.
  const mine = newest.filter(v => v.toolId === toolId);
  const withVersions = mine.map(v => v.profileId);
  const profile = data.profiles.find(p => p._id === wanted) ?? data.profiles.find(p => withVersions.includes(p._id)) ?? data.profiles[0];
  const current = mine.find(v => v.profileId === profile._id);
  const status = coverageStatus(current);

  const initial: DraftRow[] = (current?.entries ?? []).map(e => ({
    key: e.key,
    value: e.value,
    explanation: e.explanation,
    builderPart: e.builderPart,
    source: e.source,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "All tools", href: "/tool-owner" }, { label: tool.name }]} />
      <div className="flex flex-col gap-3">
        <PageHeader title={`${tool.name}: what it covers`}>
          {profile.title}, {current ? `editing from version ${current.version}` : "no coverage recorded yet"}.
        </PageHeader>
        <p className="flex flex-wrap items-center gap-3">
          <span className="text-small font-semibold text-ink">Version {current ? current.version : "none"}</span>
          <StatusMark status={status} />
          {current && <span className="tnum text-small text-ink-soft">Saved {current.createdAt.slice(0, 10)}</span>}
        </p>
        {new Set(withVersions).size > 1 && (
          <p className="flex gap-4">
            {data.profiles
              .filter(p => withVersions.includes(p._id))
              .map(p =>
                p._id === profile._id ? (
                  <span key={p._id} className="font-semibold">
                    {p.title}
                  </span>
                ) : (
                  <TextLink key={p._id} href={`/tool-owner/tools/${toolId}?profile=${p._id}`}>
                    {p.title}
                  </TextLink>
                ),
              )}
          </p>
        )}
      </div>

      {current?.sentBack && (
        <Note tone="attention" title={`Version ${current.version} was sent back on ${current.sentBack.at.slice(0, 10)}.`}>
          <div className="flex flex-col gap-2">
            <p>
              {current.sentBack.by} wrote: &ldquo;{current.sentBack.note}&rdquo;
            </p>
            <p>Correct the rows, then save a new version. An admin checks it again.</p>
          </div>
        </Note>
      )}

      <CoverageEditor
        toolId={tool._id}
        toolName={tool.name}
        profileId={profile._id}
        versionId={current?._id ?? "none"}
        importHref={`/tool-owner/import?tool=${encodeURIComponent(tool._id)}&profile=${encodeURIComponent(profile._id)}`}
        requirements={profile.entries.map(e => ({ key: e.key, id: e.id, family: e.family, title: e.title, level: e.level }))}
        initialRows={initial}
        defaultSource={current?.source ?? ""}
      />
    </div>
  );
}
