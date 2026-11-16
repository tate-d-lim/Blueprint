import { notFound } from "next/navigation";
import { RoleGate } from "@/app/components/role-gate";
import { TextLink } from "@/app/ui/button";
import { PageHeader } from "@/app/ui/panel";
import { Breadcrumb } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { loadPlanData } from "@/lib/data/repos/plan-data";
import type { DraftRow } from "@/lib/tool-owner/new-version";
import { CoverageEditor } from "./coverage-editor";

export default function ToolPage(props: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ profile?: string }>;
}) {
  return (
    <RoleGate need="tool-owner">
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
    explanation: e.explanation,
    builderPart: e.builderPart,
    source: e.source,
  }));

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb items={[{ label: "All tools", href: "/tool-owner" }, { label: tool.name }]} />
      <div className="flex flex-col gap-3">
        <PageHeader title={`${tool.name}: what it covers`}>
          {profile.title}, {current ? `editing from version ${current.version}` : "no coverage recorded yet"}.
        </PageHeader>
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

      <CoverageEditor
        toolId={tool._id}
        toolName={tool.name}
        profileId={profile._id}
        requirements={profile.entries.map(e => ({ key: e.key, id: e.id, family: e.family, title: e.title, level: e.level }))}
        initialRows={initial}
        defaultSource={current?.source ?? ""}
      />
    </div>
  );
}
