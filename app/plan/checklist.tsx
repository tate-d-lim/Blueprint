"use client";

import Link from "next/link";
import { useState } from "react";
import { Checkbox } from "@/app/ui/field";
import { Disclosure } from "@/app/ui/disclosure";
import { Tag } from "@/app/ui/stamp";
import type { PlanItem } from "@/lib/plan/engine";
import { partOf, partTitle, visibleParts } from "@/lib/plan/hotel";
import { taskStatusOf } from "@/lib/plan/progress";
import { startQuery } from "@/lib/plan/url-state";
import { QuestionControls } from "./item-controls";
import { ItemDetail } from "./item-detail";
import { PlanItemRow } from "./plan-item";
import { useProject } from "./project-context";

/**
 * What is left, and what is done. The builder's controls come in the order of the hotel, one group for each part, so a
 * row never moves when it is ticked. What the tools do, what the answers rule out, and what is good to have are below,
 * closed.
 */
export function Checklist() {
  const { plan, entries, overlay, setDone, setNote, answer, project, unansweredFacts, news } = useProject();
  // While the notice about a catalog change is open, the controls it names carry a tag.
  const newIds = new Set(news?.added.map(c => c.id));
  const rewordedIds = new Set(news?.reworded.map(c => c.id));
  const newsTag = (id: string) => (newIds.has(id) ? "New" : rewordedIds.has(id) ? "Reworded" : null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const open = (item: PlanItem) => {
    setDetailKey(item.key);
    setDetailOpen(true);
  };

  const by = (heading: PlanItem["heading"]) => plan.items.filter(i => i.heading === heading);
  const yours = by("you");
  const questions = by("questions").filter(i => i.placement !== "answered-not-applicable");
  const answered = by("questions").filter(i => i.placement === "answered-not-applicable");
  const platform = by("platform");
  const skipped = by("skipped");
  const extras = by("good-to-have");
  const groups = visibleParts(plan)
    .map(part => ({ part, items: yours.filter(i => partOf(i.family) === part.id) }))
    .filter(g => g.items.length > 0);
  const detailItem = detailKey ? plan.items.find(i => i.key === detailKey) : undefined;
  const closed = (title: string, items: PlanItem[]) =>
    items.length === 0 ? null : (
      <Disclosure summary={<span className="text-body font-semibold">{title}</span>} aside={<Tag>{items.length}</Tag>}>
        <ul className="flex flex-col">
          {items.map(i => (
            <PlanItemRow key={`${i.profileId}:${i.key}`} item={i} entry={entries.get(i.key)} onOpen={() => open(i)} />
          ))}
        </ul>
      </Disclosure>
    );

  return (
    <div className="flex flex-col gap-6">
      {questions.length > 0 && (
        <section aria-label="Decide first" className="flex flex-col gap-2">
          <h2 className="text-body font-semibold">Decide first</h2>
          {unansweredFacts > 0 ? (
            <p className="text-small text-ink-soft">
              These depend on your app, and you have not told us all about it yet. Answer {unansweredFacts} more {unansweredFacts === 1 ? "question" : "questions"} and your plan settles them.{" "}
              <Link
                href={`/start/app?${startQuery(project.riskAnswers, project.facts ?? {}, project._id)}`}
                className="font-medium text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                Answer them
              </Link>
            </p>
          ) : (
            <p className="text-small text-ink-soft">Your tools do not answer these. Check if each one applies to your app.</p>
          )}
          <ul className="flex flex-col divide-y divide-rule rounded-sm border border-rule">
            {questions.map(item => (
              <li key={item.key} className="flex flex-col gap-3 px-4 py-3">
                <h3 className="text-body leading-snug font-semibold">
                  <button type="button" onClick={() => open(item)} className="cursor-pointer text-left underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-ink">
                    {item.plain?.title ?? item.title}
                  </button>
                </h3>
                <p className="text-small text-ink-soft">{item.reason}</p>
                <QuestionControls item={item} controls={{ onAnswer: answer }} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Your controls" className="flex flex-col gap-4">
        {yours.length === 0 && <p className="text-body text-ink-soft">Nothing in your plan is yours to do.</p>}
        {groups.map(({ part, items }) => {
          const done = items.filter(i => taskStatusOf(i) === "done").length;
          return (
            <div key={part.id} className="flex flex-col">
              <h2 className="flex items-baseline justify-between gap-3 border-b border-rule-strong pb-1 text-body font-semibold">
                <span>{partTitle(part, [...new Set(items.map(i => i.family))])}</span>
                <span className="tnum text-small font-normal text-ink-soft">
                  {done} of {items.length} done
                </span>
              </h2>
              <ul>
                {items.map(item => {
                  const isDone = taskStatusOf(item) === "done";
                  const title = item.plain?.title ?? item.title;
                  // GovTech's published guides are written for agencies; their words stay in the details, attributed.
                  const what = item.decisive.filter(c => c.verification !== "govtech-published").map(c => c.builderPart).find(Boolean) ?? item.plain?.task;
                  return (
                    <li key={item.key} className="flex items-start justify-between gap-3 border-b border-rule py-3 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <Checkbox
                          name={`done-${item.id}`}
                          checked={isDone}
                          onChange={e => setDone(item.key, e.target.checked)}
                          label={
                            <span className={isDone ? "text-ink-soft" : "font-semibold"}>
                              {title}
                              {newsTag(item.id) && (
                                <>
                                  {" "}
                                  <Tag>{newsTag(item.id)}</Tag>
                                </>
                              )}
                            </span>
                          }
                          hint={isDone ? undefined : what ? <span className="line-clamp-2">{what}</span> : undefined}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => open(item)}
                        aria-label={`Details: ${title}`}
                        className="shrink-0 cursor-pointer pt-0.5 text-small font-medium text-ink underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-ink"
                      >
                        Details
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <div className="flex flex-col border-t border-rule">
        {closed("Done by your tools", platform)}
        {answered.length > 0 && (
          <Disclosure summary={<span className="text-body font-semibold">Answered</span>} aside={<Tag>{answered.length}</Tag>}>
            <ul className="flex flex-col">
              {answered.map(item => (
                <li key={item.key} className="flex flex-col gap-1 border-b border-rule py-3 last:border-b-0">
                  <p className="text-body font-semibold">{item.plain?.title ?? item.title}</p>
                  <QuestionControls item={item} controls={{ onAnswer: answer }} />
                </li>
              ))}
            </ul>
          </Disclosure>
        )}
        {closed("Does not apply to your app", skipped)}
        {closed("Good to have", extras)}
      </div>

      {detailItem && (
        <ItemDetail
          item={detailItem}
          entry={entries.get(detailItem.key)}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          note={detailItem.heading === "you" ? { value: overlay.taskStatus[detailItem.key]?.note ?? "", onSave: v => setNote(detailItem.key, v) } : undefined}
        />
      )}
    </div>
  );
}
