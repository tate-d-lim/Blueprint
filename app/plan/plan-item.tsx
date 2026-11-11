import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { areaOf } from "@/lib/plan/hotel";
import { GOOD_TO_HAVE_LABEL } from "@/lib/plan/labels";
import { itemVerification } from "@/lib/plan/verification";
import { Badge, Chip } from "./badge";

/**
 * One line of a collapsed group: what a tool does, what the answers rule out, or what is good to have. It says who
 * does it and whether that is verified. A button opens the details.
 */
export function PlanItemRow({ item, entry, onOpen }: { item: PlanItem; entry?: ProfileEntry; onOpen: () => void }) {
  void entry;
  const verification = itemVerification(item);
  const title = item.plain?.title ?? item.title;
  // GovTech's published guides are written for agencies and use their jargon. Their words are shown in the
  // detail panel, attributed; this list sticks to plain language.
  const ours = item.decisive.filter(c => c.verification !== "govtech-published");
  const explanations = ours.filter(c => c.explanation);
  const hasGovTechText = item.decisive.some(c => c.verification === "govtech-published" && (c.explanation || c.builderPart));
  return (
    <li className="flex flex-col gap-1.5 border-b border-rule py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h3 className="text-body leading-snug font-semibold">
          <button
            type="button"
            onClick={onOpen}
            className="cursor-pointer text-left text-ink underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-ink hover:decoration-2"
          >
            {title}
          </button>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {item.level === 2 && <Chip>{GOOD_TO_HAVE_LABEL[item.placement]}</Chip>}
          {/* Verified is the normal case; a stamp marks only the exceptions. */}
          {verification && verification !== "verified" && <Badge verification={verification} />}
        </div>
      </div>
      {item.heading === "skipped" && <p className="max-w-measure text-small text-ink-soft">{item.reason}</p>}
      {explanations.length > 0 && <p className="max-w-measure text-small text-ink-soft">{explanations.map(c => c.explanation).join(" ")}</p>}
      {hasGovTechText && <p className="text-small text-ink-soft">GovTech&apos;s own notes are in the details.</p>}
      <p className="tnum text-small text-ink-soft">
        {item.id} in {areaOf(item.family)}
      </p>
    </li>
  );
}
