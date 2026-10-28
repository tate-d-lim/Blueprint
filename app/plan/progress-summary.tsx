import { SgdsCard, SgdsProgressBar } from "@govtechsg/sgds-web-component/react";
import type { PlanProgress } from "@/lib/plan/progress";

/** How far a saved project has got: tasks done, with the in-progress and to-do counts and the questions answered. */
export function ProgressSummary({ progress }: { progress: PlanProgress }) {
  const { tasks, questions } = progress;
  const percent = tasks.total ? Math.round((tasks.done / tasks.total) * 100) : 0;
  return (
    <SgdsCard>
      <div className="sgds:flex sgds:flex-col sgds:gap-sm">
        <div className="sgds:flex sgds:flex-wrap sgds:items-baseline sgds:justify-between sgds:gap-sm">
          <h2 className="sgds:text-subtitle-md sgds:font-semibold">
            {tasks.done} of {tasks.total} tasks done
          </h2>
          <span className="sgds:text-body-sm sgds:text-subtle">{percent}%</span>
        </div>
        <SgdsProgressBar value={percent} ariaLabel={`${tasks.done} of ${tasks.total} tasks done`} />
        <p className="sgds:text-body-sm sgds:text-subtle">
          {tasks.inProgress} in progress, {tasks.todo} to do.{" "}
          {questions.total > 0 &&
            (questions.answered === questions.total
              ? `All ${questions.total} questions answered.`
              : `${questions.answered} of ${questions.total} questions answered.`)}
        </p>
      </div>
    </SgdsCard>
  );
}
