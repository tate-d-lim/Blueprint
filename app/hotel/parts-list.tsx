"use client";

import type { PartId, PartState } from "@/lib/plan/hotel";

/**
 * "Parts of your app": one button per part, in order from the top floor to the basement. It is the keyboard and
 * screen-reader path to the same detail the pointer gets. Pressing a chosen part again shows the whole hotel.
 */
export function PartsList({
  parts,
  selected,
  onSelect,
}: {
  parts: PartState[];
  selected: PartId | null;
  onSelect: (id: PartId | null) => void;
}) {
  return (
    <section aria-labelledby="parts-list-heading" className="flex flex-col gap-2">
      <h2 id="parts-list-heading" className="text-small font-semibold text-ink">
        Parts of your app
      </h2>
      <ul className="grid grid-cols-3 gap-2">
        {parts.map(part => {
          const pressed = selected === part.id;
          return (
            <li key={part.id}>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => onSelect(pressed ? null : part.id)}
                className={`relative flex h-full w-full cursor-pointer flex-col rounded-sm border px-3 py-2 text-left ${
                  pressed ? "border-ink bg-ink text-paper" : "border-rule-strong bg-paper text-ink hover:border-ink"
                }`}
              >
                <span className="narrow text-small leading-tight font-semibold">{part.line1}</span>
                <span className={`narrow tnum text-small leading-tight ${pressed ? "text-paper/85" : "text-ink-soft"}`}>{part.line2}</span>
                {part.question && (
                  <>
                    <span aria-hidden="true" className="absolute top-2 right-2 size-2 rounded-full bg-redline" />
                    <span className="sr-only">has open questions</span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
