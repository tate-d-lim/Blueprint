import { Disclosure } from "@/app/ui/disclosure";
import type { HotelPart, PartState } from "@/lib/plan/hotel";
import type { DetailRow } from "@/lib/plan/needs";

/** The side panel for a chosen part: what it protects first, then the full requirements on request. */
export function PartDetails({ part, state, rows }: { part: HotelPart; state: PartState; rows: DetailRow[] }) {
  return (
    <section aria-labelledby="part-details-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="part-details-heading" className="wide text-title font-semibold">
          {part.name}
        </h2>
        <p className="text-small text-ink-soft">{state.families.join(", ")}</p>
      </div>
      <p className="max-w-measure text-body">{part.summary}</p>
      <p className="tnum text-body font-semibold">{state.line2}</p>

      {rows.length > 0 && (
        <Disclosure summary={<span className="text-body font-semibold">Show all {rows.length} requirements</span>}>
          <ul className="flex flex-col gap-4 pt-1">
            {rows.map(row => (
              <li key={row.key} className="flex flex-col gap-1.5 border-b border-rule pb-4 last:border-b-0">
                <p className="max-w-measure text-body">
                  {row.question && <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-redline align-middle" />}
                  {row.text}
                </p>
                {row.question && <p className="text-small text-redline">Someone must check if this applies.</p>}
                {row.plainChecked ? (
                  <Disclosure summary={<span className="text-small font-medium">Official wording</span>}>
                    <p className="max-w-measure text-small text-ink-soft">
                      <span className="font-code">{row.id}</span> {row.official}
                    </p>
                  </Disclosure>
                ) : (
                  <p className="text-small text-ink-soft">
                    <span className="font-code">{row.id}</span> A plain version isn&apos;t checked for this risk level yet.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
    </section>
  );
}
