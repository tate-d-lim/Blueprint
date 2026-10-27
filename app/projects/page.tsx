import Link from "next/link";
import { withDb } from "@/lib/data/db";
import { listProjects } from "@/lib/data/repos/projects";

export default async function ProjectsPage() {
  const projects = await withDb(listProjects);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Saved projects</h1>
        <p className="mt-1 text-muted">Pick up a plan where you left off. Everyone here shares one list.</p>
      </div>
      {projects.length === 0 && (
        <p className="rounded-xl border border-line bg-surface p-5">
          Nothing saved yet. <Link href="/start" className="text-accent underline">Start a plan</Link>, then choose &ldquo;Save this plan&rdquo;.
        </p>
      )}
      <ul className="space-y-3">
        {projects.map(p => (
          <li key={p._id}>
            <Link href={`/projects/${p._id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-4 hover:border-accent/60">
              <span>
                <span className="block font-medium">{p.name}</span>
                <span className="text-sm text-muted">Owner: {p.ownerName}</span>
              </span>
              <span className="text-sm text-muted">Updated {p.updatedAt.slice(0, 10)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
