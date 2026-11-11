"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Hotel } from "@/app/hotel/hotel";
import { PartCard } from "@/app/hotel/part-card";
import type { PartId } from "@/lib/plan/hotel";
import { Checklist } from "./checklist";
import { useProject } from "./project-context";
import { ToolsPanel } from "./tools-panel";

/**
 * The first tab of a saved project: the hotel beside the checklist. The hotel shows how far each part has got; a click
 * on a part opens the Hotel tab on that part. The checklist is the one place to tick controls.
 */
export function PlanTab() {
  const { project, parts } = useProject();
  const router = useRouter();
  const [selected, setSelected] = useState<PartId | null>(null);
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_440px]">
      <div className="flex min-h-0 min-w-0 flex-col p-4">
        <Hotel
          parts={parts}
          selected={selected}
          onSelect={setSelected}
          interactive
          card={<PartCard id={selected} parts={parts} />}
          onPick={id => router.push(`/projects/${project._id}/hotel?part=${id}`)}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-col gap-5 overflow-y-auto border-l border-rule bg-paper px-6 py-5">
        <ToolsPanel />
        <Checklist />
      </div>
    </div>
  );
}
