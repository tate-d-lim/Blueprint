"use client";

import Link from "next/link";
import { useState } from "react";
import { Hotel } from "@/app/hotel/hotel";
import { HotelFrame } from "@/app/hotel/hotel-frame";
import { PartsList } from "@/app/hotel/parts-list";
import { Disclosure } from "@/app/ui/disclosure";
import type { FactAnswers } from "@/lib/domain/types";
import { PARTS, type PartId, type PartState } from "@/lib/plan/hotel";
import type { DetailRow } from "@/lib/plan/needs";
import { useUnsavedGuard } from "@/lib/plan/unsaved";
import type { RiskAnswers } from "@/lib/risk/assess";
import { PartDetails } from "./part-details";
import { SaveBar } from "./save-bar";

export interface NeedsViewProps {
  profileTitle: string;
  line: string;
  coverageLine: string | null;
  parts: PartState[];
  details: Record<PartId, DetailRow[]>;
  skipped: { id: string; title: string; reason: string }[];
  /** The step link's query, for the "change" links. */
  query: string;
  answers: RiskAnswers;
  facts: FactAnswers;
  edit: { projectId: string; projectName: string; dirty: boolean; typeChange: string | null } | null;
}

/** Step 4: everything the app needs, drawn as the hotel with no tools, and the save. */
export function NeedsView({ profileTitle, line, coverageLine, parts, details, skipped, query, answers, facts, edit }: NeedsViewProps) {
  const [selected, setSelected] = useState<PartId | null>(null);
  useUnsavedGuard(edit?.dirty ?? false);

  const part = PARTS.find(p => p.id === selected);
  const state = parts.find(p => p.id === selected);

  return (
    <HotelFrame
      hotel={
        <>
          <Hotel parts={parts} selected={selected} onSelect={setSelected} interactive />
          <PartsList parts={parts} selected={selected} onSelect={setSelected} />
        </>
      }
      panel={
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="wide text-heading font-semibold">What your app needs</h1>
            <p className="text-small text-ink-soft">
              {profileTitle} ·{" "}
              <Link href={`/start?${query}`} className="underline">
                Change risk answers
              </Link>{" "}
              ·{" "}
              <Link href={`/start/app?${query}`} className="underline">
                Change app details
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <p className="max-w-measure text-body font-medium">{line}</p>
            {coverageLine && <p className="text-small text-ink-soft">{coverageLine}</p>}
          </div>

          {part && state ? (
            <PartDetails part={part} state={state} rows={details[part.id]} />
          ) : (
            <p className="max-w-measure text-body text-ink-soft">Point at a part, or pick it in the list, to see what it asks for.</p>
          )}

          {skipped.length > 0 && (
            <Disclosure summary={<span className="text-body font-semibold">Left out because of your answers ({skipped.length})</span>}>
              <ul className="flex flex-col gap-3 pt-1">
                {skipped.map(item => (
                  <li key={item.id} className="flex flex-col text-small">
                    <span>
                      <span className="font-code">{item.id}</span> {item.title}
                    </span>
                    <span className="text-ink-soft">{item.reason}</span>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
          {edit?.typeChange && <p className="max-w-measure text-body font-medium">{edit.typeChange}</p>}
        </div>
      }
      foot={
        <SaveBar
          answers={answers}
          facts={facts}
          defaultName={`${profileTitle} app`}
          edit={edit ? { projectId: edit.projectId, projectName: edit.projectName } : null}
        />
      }
    />
  );
}
