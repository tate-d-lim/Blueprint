"use client";

import type { PartId, PartState } from "@/lib/plan/hotel";

/**
 * "Parts of your app": one row per part, in order from the top floor to the basement, in the side panel. It is the
 * keyboard and screen-reader path to the same detail the pointer gets. Pressing a chosen part again shows the whole
 * hotel.
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
      <h2 id="parts-list-heading" className="text-body font-semibold">
        Parts of your app
      </h2>
      <ul className="flex flex-col border-y border-rule">
        {parts.map(part => {
          const pressed = selected === part.id;
          return (
            <li key={part.id} className="border-b border-rule last:border-b-0">
              <button
                type="button"
                data-part={part.id}
                aria-pressed={pressed}
                onClick={() => onSelect(pressed ? null : part.id)}
                className={`relative flex w-full cursor-pointer flex-col px-3 py-2 text-left ${
                  pressed ? "bg-ink text-paper" : "text-ink hover:bg-ground"
                }`}
              >
                <span className="narrow pr-4 text-small leading-snug font-semibold">{part.line1}</span>
                <span className={`narrow tnum text-small leading-snug ${pressed ? "text-paper/85" : "text-ink-soft"}`}>{part.line2}</span>
                {part.question && (
                  <>
                    <span aria-hidden="true" className="absolute top-3 right-3 size-2 rounded-full bg-redline" />
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
