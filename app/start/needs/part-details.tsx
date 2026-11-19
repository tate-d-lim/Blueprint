import { Disclosure } from "@/app/ui/disclosure";
import type { HotelPart, PartState } from "@/lib/plan/hotel";
import { LEVEL_LABEL } from "@/lib/plan/labels";
import type { DetailRow } from "@/lib/plan/needs";

/** How many requirements the card shows before "Show all". */
const EXAMPLES = 3;
const count = (n: number) => (n === 1 ? "1 control" : `${n} controls`);

/**
 * The card for one part of the hotel on step 4: what the set of requirements is for, how many your app has, a few of
 * them in plain words, and then all of them with their official wording.
 */
export function PartDetails({
  part,
  state,
  rows,
  headingRef,
}: {
  part: HotelPart;
  state: PartState;
  rows: DetailRow[];
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  // The examples are short: controls with plain text first, and the official title for a control that has none.
  const examples = [...rows.filter(r => r.plainChecked), ...rows.filter(r => !r.plainChecked)].slice(0, EXAMPLES);
  const questions = state.counts.questions;
  const open = state.counts.you + questions;
  return (
    <section aria-labelledby="part-details-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="part-details-heading" ref={headingRef} tabIndex={-1} className="wide text-title font-semibold outline-none">
          {state.families.join(", ")}
        </h2>
        <p className="text-body text-ink-soft">{part.name}</p>
      </div>

      <p className="max-w-measure text-lead">{part.summary}</p>

      <div className="flex flex-col gap-1 border-y border-rule py-3">
        <p className="tnum text-body font-semibold">{state.nothingForApp ? "Nothing in this part applies to your app." : `Your app has ${count(open)} in this part.`}</p>
        {questions > 0 && (
          <p className="tnum text-small text-redline">
            {questions === 1 ? "1 of them may not apply." : `${questions} of them may not apply.`} Someone should check each one with a red dot.
          </p>
        )}
      </div>

      {examples.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-body font-semibold">{rows.length > EXAMPLES ? "For example" : rows.length === 1 ? "The control" : "The controls"}</h3>
          <ul className="flex flex-col gap-2">
            {examples.map(row => (
              <li key={row.key} className="flex gap-2 text-body">
                <span aria-hidden="true" className={`mt-2 size-1.5 shrink-0 rounded-full ${row.question ? "bg-redline" : "bg-ink"}`} />
                <span {...(row.plainChecked ? {} : { "data-official": true })}>{row.plainChecked ? row.text : row.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="border-t border-rule">
          <Disclosure summary={<span className="text-body font-semibold">Show all {rows.length} controls</span>}>
            <ul className="flex flex-col gap-4 pt-1">
              {rows.map(row => (
                <li key={row.key} className="flex flex-col gap-1.5 border-b border-rule pb-4 last:border-b-0">
                  <p className="text-small font-medium text-ink-soft">{LEVEL_LABEL[row.level]}</p>
                  <p {...(row.plainChecked ? {} : { "data-official": true })} className="max-w-measure text-body">
                    {row.question && <span aria-hidden="true" className="mr-2 inline-block size-2 rounded-full bg-redline align-middle" />}
                    {row.text}
                  </p>
                  {row.question && <p className="text-small text-redline">Someone should check if this applies.</p>}
                  {row.plainChecked ? (
                    <Disclosure summary={<span className="text-small font-medium">Official wording</span>}>
                      <p data-official className="max-w-measure text-small text-ink-soft">
                        <span className="font-code">{row.id}</span> {row.official}
                      </p>
                    </Disclosure>
                  ) : (
                    <p className="text-small text-ink-soft">
                      <span className="font-code">{row.id}</span> A plain version is not checked for this risk level yet.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      )}
    </section>
  );
}
