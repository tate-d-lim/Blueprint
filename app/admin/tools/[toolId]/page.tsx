import Link from "next/link";
import { notFound } from "next/navigation";
import { RoleGate } from "@/app/components/role-gate";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import type { DraftRow } from "@/lib/admin/new-version";
import { CoverageEditor } from "./coverage-editor";

export default function ToolPage(props: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ profile?: string }>;
}) {
  return (
    <RoleGate need="admin">
      <ToolEditor {...props} />
    </RoleGate>
  );
}

async function ToolEditor({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ profile?: string }>;
}) {
  const { toolId } = await params;
  const { profile: wanted } = await searchParams;
  const data = await withDb(loadPlanData);
  const tool = data.tools.find(t => t._id === toolId);
  if (!tool) notFound();

  const withVersions = data.versions.filter(v => v.current.toolId === toolId).map(v => v.current.profileId);
  const profile =
    data.profiles.find(p => p._id === wanted) ??
    data.profiles.find(p => withVersions.includes(p._id)) ??
    data.profiles[0];
  const current = data.versions.find(v => v.current.toolId === toolId && v.current.profileId === profile._id)?.current;

  const initial: DraftRow[] = (current?.entries ?? []).map(e => ({
    key: e.key,
    value: e.value,
    otherToolId: e.otherToolId,
    explanation: e.explanation,
    builderPart: e.builderPart,
    source: e.source,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:underline">
          ← All tools
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tool.name}: what it covers</h1>
        <p className="mt-1 text-muted">
          Profile: {profile.title}
          {current ? ` · editing from version ${current.version}` : " · no coverage recorded yet"}
        </p>
        {new Set(withVersions).size > 1 && (
          <p className="mt-2 flex gap-3 text-sm">
            {data.profiles
              .filter(p => withVersions.includes(p._id))
              .map(p => (
                <Link key={p._id} href={`/admin/tools/${toolId}?profile=${p._id}`} className={p._id === profile._id ? "font-medium" : "text-accent underline"}>
                  {p.title}
                </Link>
              ))}
          </p>
        )}
      </div>

      <CoverageEditor
        toolId={tool._id}
        toolName={tool.name}
        profileId={profile._id}
        requirements={profile.entries.map(e => ({ key: e.key, id: e.id, family: e.family, title: e.title, level: e.level }))}
        initialRows={initial}
        otherTools={data.tools.filter(t => t._id !== tool._id).map(t => ({ id: t._id, name: t.name }))}
        defaultSource={current?.source ?? ""}
      />
    </div>
  );
}
