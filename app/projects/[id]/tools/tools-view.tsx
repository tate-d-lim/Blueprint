"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { continueToPlanAction, setProjectToolsAction } from "@/app/projects/actions";
import { Hotel } from "@/app/hotel/hotel";
import { HotelFrame } from "@/app/hotel/hotel-frame";
import { PartCard } from "@/app/hotel/part-card";
import { PartsList } from "@/app/hotel/parts-list";
import { Button } from "@/app/ui/button";
import type { Project, Section, Tool } from "@/lib/domain/types";
import { effectText, orderTools, toolEffects } from "@/lib/plan/effect";
import { buildPlan, type PlanData } from "@/lib/plan/engine";
import { partState, planTotals, runningLine, visibleParts, type PartId } from "@/lib/plan/hotel";
import { runSave } from "@/lib/plan/save";
import { selectPlanInput } from "@/lib/plan/select";
import { versionVerification, type Verification } from "@/lib/plan/verification";
import { ToolHints, ToolRow } from "./tool-row";

const SECTIONS: { id: Section; title: string }[] = [
  { id: "cpf", title: "CPF tools" },
  { id: "wog", title: "Whole-of-government tools" },
  { id: "code", title: "Code components" },
];

/** Step 5: tick the tools that are part of the app. Every tick is saved at once, and the hotel and the numbers follow it. */
export function ToolsView({ data, project, profileId, profileTitle }: { data: PlanData; project: Project; profileId: string; profileTitle: string }) {
  const router = useRouter();
  const [toolIds, setToolIds] = useState(project.toolIds);
  const [note, setNote] = useState<{ kind: "saved" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [continuing, setContinuing] = useState(false);

  const facts = useMemo(() => project.facts ?? {}, [project]);
  const overlay = useMemo(() => ({ taskStatus: project.taskStatus, questionAnswers: project.questionAnswers }), [project]);

  const plan = useMemo(() => buildPlan(selectPlanInput(data, { profileId, toolIds, facts }, overlay)), [data, profileId, toolIds, facts, overlay]);
  const effects = useMemo(() => toolEffects(data, { profileId, facts }, toolIds, overlay), [data, profileId, toolIds, facts, overlay]);
  // The order is set when the step opens and does not change on a tick, so a row never moves under the pointer.
  const [order] = useState(() => orderTools(data.tools, effects, data.versions, profileId));

  const parts = useMemo(() => visibleParts(plan).map(p => partState(p, plan, "tools")), [plan]);
  const totals = planTotals(plan);
  const covered = data.versions.some(v => v.current.profileId === profileId);
  const verification = useMemo(() => {
    const out: Record<string, Verification | null> = {};
    for (const tool of data.tools) {
      const pair = data.versions.find(v => v.current.toolId === tool._id && v.current.profileId === profileId);
      out[tool._id] = pair ? versionVerification(pair) : null;
    }
    return out;
  }, [data, profileId]);

  const toggle = (toolId: string) => {
    const previous = toolIds;
    const next = previous.includes(toolId) ? previous.filter(id => id !== toolId) : [...previous, toolId];
    setToolIds(next);
    setNote(null);
    void runSave(() => setProjectToolsAction(project._id, next)).then(error => {
      if (error) {
        setToolIds(previous);
        setNote({ kind: "error", text: error });
      } else setNote({ kind: "saved", text: "Saved" });
    });
  };

  const group = (title: string, tools: Tool[]) =>
    tools.length === 0 ? null : (
      <section aria-label={title} className="flex flex-col gap-4">
        <h2 className="text-title font-semibold">{title}</h2>
        {SECTIONS.map(section => {
          const inSection = tools.filter(t => t.section === section.id);
          if (inSection.length === 0) return null;
          return (
            <div key={section.id} className="flex flex-col gap-2">
              <h3 className="text-small font-semibold text-ink-soft">{section.title}</h3>
              <ul>
                {inSection.map(tool => (
                  <ToolRow
                    key={tool._id}
                    tool={tool}
                    checked={toolIds.includes(tool._id)}
                    verification={verification[tool._id]}
                    effect={effectText(effects[tool._id], profileTitle)}
                    onToggle={() => toggle(tool._id)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    );

  return (
    <HotelFrame
      hotel={
        <>
          <Hotel
            parts={parts}
            selected={selected}
            onSelect={setSelected}
            interactive
            card={<PartCard id={selected} parts={parts} />}
          />
        </>
      }
      panel={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="wide text-heading font-semibold">Your tools</h1>
            <p className="text-body">Tick the tools that are part of your app.</p>
          </div>
          <div className="flex flex-col gap-1">
            <p aria-live="polite" className="tnum text-body font-semibold">
              {runningLine(totals)}
              {note && (
                <span className={`ml-3 text-small font-medium ${note.kind === "error" ? "text-redline" : "text-ink-soft"}`}>{note.text}</span>
              )}
            </p>
            <p className="text-small text-ink-soft">Each requirement counts as one, whatever its size.</p>
          </div>
          {!covered && <p className="max-w-measure text-body font-medium">No tool covers {profileTitle} yet, so every part is yours.</p>}
          <ToolHints tools={data.tools} hints={plan.hints} onToggle={toggle} />
          {group("Could take more off you", order.more)}
          {group("Other tools", order.other)}
          <PartsList parts={parts} selected={selected} onSelect={setSelected} />
        </div>
      }
      foot={
        <Button
          disabled={continuing}
          onClick={async () => {
            setContinuing(true);
            const error = await runSave(() => continueToPlanAction(project._id));
            if (error) {
              setContinuing(false);
              setNote({ kind: "error", text: error });
              return;
            }
            router.push(`/projects/${project._id}`);
          }}
        >
          Continue to your plan
        </Button>
      }
    />
  );
}
