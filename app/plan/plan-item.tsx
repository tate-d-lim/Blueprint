import { SgdsCard, SgdsLink } from "@govtechsg/sgds-web-component/react";
import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
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
    <div className="sgds:flex sgds:flex-wrap sgds:items-start sgds:justify-between sgds:gap-sm">
      <h3 className="sgds:text-subtitle-md sgds:font-semibold">
        {onOpen ? (
          <SgdsLink size="lg">
            <a
              href={`#${item.id}`}
              role="button"
              suppressHydrationWarning
              onClick={e => {
                e.preventDefault();
                onOpen();
              }}
              onKeyDown={e => {
                if (e.key === " ") {
                  e.preventDefault();
                  onOpen();
                }
              }}
            >
              {title}
            </a>
          </SgdsLink>
        ) : (
          title
        )}
      </h3>
      <div className="sgds:flex sgds:flex-wrap sgds:items-center sgds:gap-text-xs">
        {item.level === 2 && <Chip>{GOOD_TO_HAVE_LABEL[item.placement]}</Chip>}
        {verification && <Badge verification={verification} />}
      </div>
    </div>
  );

  const body = (
    <>
      {!compact && (
        <div className="sgds:flex sgds:flex-col sgds:gap-text-sm sgds:text-body-sm">
          {item.heading !== "platform" && yourPart && (
            <p>
              <strong>{shared.length ? "Your part: " : "What to do: "}</strong>
              {yourPart}
            </p>
          )}
          {shared.map(c => (
            <p key={c.toolId}>
              <strong>{c.toolName}&apos;s part: </strong>
              {c.explanation ?? "Handled by the platform."}
            </p>
          ))}
          {why && (
            <p className="sgds:text-subtle">
              <strong className="sgds:text-default">Why it matters: </strong>
              {why}
            </p>
          )}
          <p className="sgds:text-subtle">{item.reason}</p>
        </div>
      )}

      {compact && explanations.length > 0 && (
        <p className="sgds:text-body-sm sgds:text-subtle">{explanations.map(c => c.explanation).join(" ")}</p>
      )}
      {hasGovTechText && (
        <p className="sgds:text-caption-md sgds:text-subtle">GovTech&apos;s own notes are in the details: open this item to read them.</p>
      )}
    </>
  );

  const controlsView =
    controls && item.heading === "you" ? (
      <TaskControls item={item} controls={controls} />
    ) : controls && item.heading === "questions" ? (
      <QuestionControls item={item} controls={controls} />
    ) : null;

  // Compact rows (the long "platform already does this" lists) stay light; the items a builder acts on are cards.
  if (compact) {
    return (
      <li className="sgds:flex sgds:flex-col sgds:gap-text-sm sgds:border-b sgds:border-muted sgds:py-sm sgds:last:border-b-0">
        {heading}
        {body}
        <p className="sgds:font-code sgds:text-caption-md sgds:text-subtle">{item.id}</p>
      </li>
    );
  }
  // A card whose select is open rises above the cards below it, so the menu isn't painted over.
  return (
    <li className="sgds:relative sgds:focus-within:z-10">
      <SgdsCard>
        <div slot="title">{heading}</div>
        <div className="sgds:flex sgds:flex-col sgds:gap-sm">
          {body}
          {controlsView}
          <p className="sgds:font-code sgds:text-caption-md sgds:text-subtle">{item.id}</p>
        </div>
      </SgdsCard>
    </li>
  );
}
