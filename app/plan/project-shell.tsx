"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Note } from "@/app/ui/note";
import { Button } from "@/app/ui/button";
import type { PlanData } from "@/lib/plan/engine";
import type { Project } from "@/lib/domain/types";
import { startQuery } from "@/lib/plan/url-state";
import { DeleteProjectButton } from "@/app/projects/delete-project";
import { ExportDialog } from "./export-dialog";
import { ProjectProvider, useProject } from "./project-context";
import { PromptButton } from "./prompt-dialog";

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
      </div>
    </ProjectProvider>
  );
}

const TAB = "inline-flex h-10 items-center border-b-2 px-1 text-body font-semibold";

function Header() {
  const { project, profileTitle, toolNames, totals, saved, error, dismissError } = useProject();
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
              · Owner {project.ownerName} · Revised {project.updatedAt.slice(0, 10)}
            </span>
          </nav>
          <h1 className="wide truncate text-heading font-semibold">{project.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-1">
          <ExportDialog query={`project=${encodeURIComponent(project._id)}`} />
          <PromptButton projectId={project._id} />
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

      <nav aria-label="Project" className="mt-2 flex gap-6">
        {tab(base, "Plan", !onHotel)}
        {tab(`${base}/hotel`, "Hotel", onHotel)}
      </nav>
    </header>
  );
}
