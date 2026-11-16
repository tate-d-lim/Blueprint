import { ButtonLink, TextLink } from "@/app/ui/button";
import { Cell, Table } from "@/app/ui/table";
import { withDb } from "@/lib/data/db";
import { listProjects } from "@/lib/data/repos/projects";
import { DeleteProjectButton } from "./delete-project";
import { dayOf } from "@/lib/dates";

const STEPS = [
  { title: "Answer questions about your app", text: "Questions about risk, then about what your app does. It takes a few minutes." },
  { title: "See your security plan", text: "Which controls apply, why they apply, and which tools do them." },
  { title: "Give the plan to your coding agent", text: "The agent gets the plan as a file and a prompt. Tick each control when it is done." },
];

export default async function ProjectsPage() {
  const projects = await withDb(listProjects);
  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Welcome" className="flex flex-col gap-5 rounded-sm border border-rule bg-paper px-6 py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="flex max-w-measure flex-col gap-1.5">
            <h1 className="text-display font-semibold tracking-[-0.01em] text-ink">Plan the security of your app</h1>
            <p className="text-lead text-ink-soft">
              Blueprint helps you understand the security controls of your app early, plan the work, and use the tools CPFB already has.
            </p>
          </div>
          <ButtonLink href="/start">Start a new plan</ButtonLink>
        </div>
        <ol className="grid grid-cols-1 divide-y divide-rule border-t border-rule md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 py-3 md:px-5 md:first:pl-0 md:last:pr-0">
              <span aria-hidden="true" className="tnum inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-ink text-small font-semibold">
                {i + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-body font-semibold">{step.title}</h2>
                <p className="text-small text-ink-soft">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {projects.length > 0 && (
        <section aria-label="Saved plans" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h2 className="text-title font-semibold">Saved plans</h2>
            <p className="text-small text-ink-soft">Everyone here sees the same list. Open a plan to continue.</p>
          </div>
          <Table head={["Project", "Owner", "Updated", <span key="actions" className="sr-only">Actions</span>]}>
            {projects.map(p => (
              <tr key={p._id}>
                <Cell>
                  <TextLink href={`/projects/${p._id}`}>{p.name}</TextLink>
                </Cell>
                <Cell>{p.ownerName}</Cell>
                <Cell nowrap className="tnum">
                  {dayOf(p.updatedAt)}
                </Cell>
                <Cell nowrap className="text-right">
                  <DeleteProjectButton projectId={p._id} projectName={p.name} look="row" />
                </Cell>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </div>
  );
}
