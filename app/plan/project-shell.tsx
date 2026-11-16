"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Note } from "@/app/ui/note";
import { Button } from "@/app/ui/button";
import { newsSentence, type ProjectNews } from "@/lib/catalog/news";
import type { PlanData } from "@/lib/plan/engine";
import type { Project } from "@/lib/domain/types";
import { startQuery } from "@/lib/plan/url-state";
import { DeleteProjectButton } from "@/app/projects/delete-project";
import { ExportDialog } from "./export-dialog";
import { ProjectProvider, useProject } from "./project-context";
import { NextStrip } from "./next-strip";
import { HandoffButton, HandoffDialog } from "./prompt-dialog";
import { ToolsDrawer } from "./tools-panel";
import { dayOf } from "@/lib/dates";

/**
 * A saved project: one header that stays on every tab (the name, how far it has got, and the two actions), the tabs,
 * and the tab itself under them, filling the rest of the window.
 */
export function ProjectShell({
  data,
  project,
  profileId,
  profileTitle,
  children,
}: {
  data: PlanData;
  project: Project;
  profileId: string;
  profileTitle: string;
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider data={data} project={project} profileId={profileId} profileTitle={profileTitle}>
      <div style={{ height: "calc(100dvh - var(--header-h))" }} className="-mx-8 -mt-8 -mb-16 flex flex-col overflow-hidden">
        <Header />
        <div className="min-h-0 flex-1">{children}</div>
        <ToolsDrawer />
        <HandoffDialog />
      </div>
    </ProjectProvider>
  );
}

const TAB = "inline-flex h-10 items-center border-b-2 px-1 text-body font-semibold";

function Header() {
  const { project, profileTitle, toolNames, totals, saved, error, dismissError, news, dismissNews } = useProject();
  const pathname = usePathname();
  const base = `/projects/${project._id}`;
  const onHotel = pathname === `${base}/hotel`;
  const left = totals.total - totals.done;
  const percent = totals.total ? Math.round((totals.done / totals.total) * 100) : 0;
  const tab = (href: string, label: string, current: boolean) => (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`${TAB} ${current ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="shrink-0 border-b border-rule bg-paper px-8 pt-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <nav aria-label="Breadcrumb" className="text-small text-ink-soft">
            <Link href="/projects" className="underline decoration-1 underline-offset-4 hover:decoration-2">
              Projects
            </Link>
            <span className="tnum">
              {" "}
              · Owner {project.ownerName} · Revised {dayOf(project.updatedAt)}
            </span>
          </nav>
          <h1 className="wide truncate text-heading font-semibold">{project.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          <ExportDialog query={`project=${encodeURIComponent(project._id)}`} />
          <HandoffButton />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
        <p className="tnum text-body font-semibold">
          {totals.done} of {totals.total} done
          <span className="font-normal text-ink-soft">
            {" "}
            · {totals.platform} by your tools · {left} left
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Controls done"
          aria-valuemin={0}
          aria-valuemax={totals.total}
          aria-valuenow={totals.done}
          className="h-1.5 w-56 border border-rule-strong bg-ground"
        >
          <div className="h-full bg-done" style={{ width: `${percent}%` }} />
        </div>
        <p role="status" className="tnum min-w-12 text-small text-ink-soft">
          {saved ? "Saved" : ""}
        </p>
        <div className="ml-auto text-small text-ink-soft">
          {profileTitle} · {toolNames.length ? toolNames.join(", ") : "No tools"} ·{" "}
          <Link
            href={`/start/app?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`}
            className="font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
          >
            Change answers
          </Link>{" "}
          · <DeleteProjectButton projectId={project._id} projectName={project.name} look="link" />
        </div>
      </div>

      {news && (
        <div className="mt-3">
          <CatalogNotice news={news} onDismiss={dismissNews} />
        </div>
      )}

      {error && (
        <div className="mt-3">
          <Note
            tone="error"
            action={
              <Button size="sm" variant="secondary" onClick={dismissError}>
                Dismiss
              </Button>
            }
          >
            {error}
          </Note>
        </div>
      )}

      <NextStrip />

      <nav aria-label="Project" className="mt-1 flex gap-6">
        {tab(base, "Plan", !onHotel)}
        {tab(`${base}/hotel`, "Hotel", onHotel)}
      </nav>
    </header>
  );
}

const named = (items: { id: string; title: string }[]) => items.map(i => `${i.title} (${i.id})`).join(", ");

/**
 * The IM8 catalog changed after the builder last looked. The plan already uses the new catalog; this says what is
 * different, so that nothing changes without a word. It stays until the builder closes it.
 */
function CatalogNotice({ news, onDismiss }: { news: ProjectNews; onDismiss: () => void }) {
  const lines: [string, string][] = [
    ["New", named(news.added)],
    ["Reworded", named(news.reworded)],
    ["New level", named(news.levelChanged)],
    ["Removed", named(news.removed)],
  ];
  return (
    <section aria-label="Catalog change" className="flex items-start justify-between gap-6 rounded-sm border border-rule-strong bg-ground px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body font-semibold">
          The IM8 catalog changed on {dayOf(news.latestAt)}: {newsSentence(news)}
        </p>
        <p className="text-small text-ink-soft">Your plan already uses the new catalog. Your ticks and notes stay as they are.</p>
        <dl className="mt-1 flex flex-col gap-0.5 text-small">
          {lines
            .filter(([, text]) => text)
            .map(([label, text]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 font-semibold">{label}:</dt>
                <dd className="line-clamp-2 text-ink-soft">{text}</dd>
              </div>
            ))}
        </dl>
      </div>
      <Button size="sm" variant="secondary" onClick={onDismiss} className="shrink-0">
        Hide this notice
      </Button>
    </section>
  );
}
