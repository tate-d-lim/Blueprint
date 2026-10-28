import { SgdsBreadcrumb, SgdsBreadcrumbItem } from "@govtechsg/sgds-web-component/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppLink } from "@/app/components/app-link";
import { PageHeader } from "@/app/components/page-header";
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
    <div className="sgds:flex sgds:flex-col sgds:gap-layout-md">
      <div className="sgds:flex sgds:flex-col sgds:gap-sm">
        <SgdsBreadcrumb>
          <SgdsBreadcrumbItem>
            <Link href="/admin" suppressHydrationWarning>
              All tools
            </Link>
          </SgdsBreadcrumbItem>
          <SgdsBreadcrumbItem active>{tool.name}</SgdsBreadcrumbItem>
        </SgdsBreadcrumb>
        <PageHeader title={`${tool.name}: what it covers`}>
          Profile: {profile.title}
          {current ? ` · editing from version ${current.version}` : " · no coverage recorded yet"}
        </PageHeader>
        {new Set(withVersions).size > 1 && (
          <p className="sgds:flex sgds:gap-sm">
            {data.profiles
              .filter(p => withVersions.includes(p._id))
              .map(p =>
                p._id === profile._id ? (
                  <strong key={p._id}>{p.title}</strong>
                ) : (
                  <AppLink key={p._id} href={`/admin/tools/${toolId}?profile=${p._id}`}>
                    {p.title}
                  </AppLink>
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
        otherTools={data.tools.filter(t => t._id !== tool._id).map(t => ({ id: t._id, name: t.name }))}
        defaultSource={current?.source ?? ""}
      />
    </div>
  );
}
