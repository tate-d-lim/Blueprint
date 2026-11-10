import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { areaOf } from "@/lib/plan/hotel";
import { GOOD_TO_HAVE_LABEL } from "@/lib/plan/labels";
import { itemVerification } from "@/lib/plan/verification";
import { Badge, Chip } from "./badge";
import { QuestionControls, TaskControls, type ItemControls } from "./item-controls";

export function PlanItemView({
  item,
  entry,
  compact = false,
  controls,
  onOpen,
}: {
  item: PlanItem;
  entry?: ProfileEntry;
  compact?: boolean;
  controls?: ItemControls;
  onOpen?: () => void;
}) {
  const verification = itemVerification(item);
  const title = item.plain?.title ?? item.title;
  const why = item.plain?.why ?? entry?.rationale;
  // GovTech's published guides are written for agencies and use their jargon. Their words are shown in the
  // detail panel, attributed; this list sticks to plain language.
  const ours = item.decisive.filter(c => c.verification !== "govtech-published");
  const hasGovTechText = item.decisive.some(c => c.verification === "govtech-published" && (c.explanation || c.builderPart));
  const shared = ours.filter(c => c.value === "shared");
  const yourPart = ours.map(c => c.builderPart).find(Boolean) ?? item.plain?.task;
  const explanations = ours.filter(c => c.explanation);

  const heading = (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <h3 className="text-lead leading-snug font-semibold">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="cursor-pointer text-left text-ink underline decoration-rule-strong decoration-1 underline-offset-4 hover:decoration-ink hover:decoration-2"
          >
            {title}
          </button>
        ) : (
          title
        )}
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {item.level === 2 && <Chip>{GOOD_TO_HAVE_LABEL[item.placement]}</Chip>}
        {/* Verified is the normal case, already stated in the tool picker; a stamp marks only the exceptions. */}
        {verification && verification !== "verified" && <Badge verification={verification} />}
      </div>
    </div>
  );

  const reference = (
    <p className="tnum text-small text-ink-soft">
      {item.id} in {areaOf(item.family)}
    </p>
  );

  if (compact) {
    return (
      <li className="flex flex-col gap-1.5 border-b border-rule py-3 last:border-b-0">
        {heading}
        {item.heading === "skipped" && <p className="max-w-measure text-body text-ink-soft">{item.reason}</p>}
        {explanations.length > 0 && <p className="max-w-measure text-body text-ink-soft">{explanations.map(c => c.explanation).join(" ")}</p>}
        {hasGovTechText && <p className="text-small text-ink-soft">GovTech&apos;s own notes are in the details: open this item to read them.</p>}
        {reference}
      </li>
    );
  }

  return (
    // One row of the section's ruled list.
    <li className="flex flex-col gap-3 px-5 py-4">
      {heading}
      <div className="flex flex-col gap-3">
        <div className="flex max-w-measure flex-col gap-2 text-body">
          {item.heading !== "platform" && yourPart && (
            <p>
              <span className="font-semibold">{shared.length ? "Your part: " : "What to do: "}</span>
              {yourPart}
            </p>
          )}
          {shared.map(c => (
            <p key={c.toolId}>
              <span className="font-semibold">{c.toolName}&apos;s part: </span>
              {c.explanation ?? "Handled by the platform."}
            </p>
          ))}
          {why && (
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">Why it matters: </span>
              {why}
            </p>
          )}
          <p className="text-ink-soft">{item.reason}</p>
          {hasGovTechText && <p className="text-small text-ink-soft">GovTech&apos;s own notes are in the details: open this item to read them.</p>}
        </div>
        {controls && item.heading === "you" && <TaskControls item={item} controls={controls} />}
        {controls && item.heading === "questions" && <QuestionControls item={item} controls={controls} />}
        {reference}
      </div>
    </li>
  );
}
