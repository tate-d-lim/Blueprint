import { PARTS, type PartId, type PartState } from "@/lib/plan/hotel";

/** The card next to a part the pointer is on: the part, its state, what it protects, and who does it. */
export function PartCard({ id, parts }: { id: PartId | null; parts: PartState[] }) {
  const part = PARTS.find(p => p.id === id);
  const state = parts.find(p => p.id === id);
  if (!part || !state) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="narrow text-body font-semibold">{state.line1}</p>
      <p className="narrow tnum text-small text-ink-soft">{state.line2}</p>
      <p className="text-small">{part.summary}</p>
      <p className="text-small text-ink-soft">
        Who does it: {state.toolNames.length ? state.toolNames.join(", ") : state.nothingForApp ? "nothing to do" : "you"}
      </p>
    </div>
  );
}
