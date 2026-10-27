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
  const shared = item.decisive.filter(c => c.value === "shared");
  const yourPart = item.decisive.map(c => c.builderPart).find(Boolean) ?? item.plain?.task;
  const explanations = item.decisive.filter(c => c.explanation);

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug">
          {onOpen ? (
            <button type="button" onClick={onOpen} className="text-left hover:text-accent hover:underline">
              {title}
            </button>
          ) : (
            title
          )}
        </h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {item.level === 2 && <Chip>{GOOD_TO_HAVE_LABEL[item.placement]}</Chip>}
          {verification && <Badge verification={verification} />}
        </div>
      </div>

      {!compact && (
        <div className="mt-2 space-y-1.5 text-sm">
          {item.heading !== "platform" && yourPart && (
            <p>
              <span className="font-medium">{shared.length ? "Your part: " : "What to do: "}</span>
              {yourPart}
            </p>
          )}
          {shared.map(c => (
            <p key={c.toolId}>
              <span className="font-medium">{c.toolName}&apos;s part: </span>
              {c.explanation ?? "Handled by the platform."}
            </p>
          ))}
          {why && (
            <p className="text-muted">
              <span className="font-medium text-foreground">Why it matters: </span>
              {why}
            </p>
          )}
          <p className="text-muted">{item.reason}</p>
        </div>
      )}

      {compact && explanations.length > 0 && (
        <p className="mt-1 text-sm text-muted">{explanations.map(c => c.explanation).join(" ")}</p>
      )}

      {controls && item.heading === "you" && <TaskControls item={item} controls={controls} />}
      {controls && item.heading === "questions" && <QuestionControls item={item} controls={controls} />}

      <p className="mt-2 font-mono text-xs text-muted">{item.id}</p>
    </li>
  );
}
