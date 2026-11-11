import { PARTS, type PartId, type PartState } from "@/lib/plan/hotel";

/** The card next to a part the pointer is on: the part, how far it has got, and who does what. */
export function PartCard({ id, parts }: { id: PartId | null; parts: PartState[] }) {
  const part = PARTS.find(p => p.id === id);
  const state = parts.find(p => p.id === id);
  if (!part || !state) return null;
  const who: string[] = [];
  if (state.counts.platform) who.push(`${state.toolNames.length ? state.toolNames.join(", ") : "Your tools"} did ${state.counts.platform}`);
  if (state.counts.you) who.push(`you have ${state.counts.you - state.counts.done} left of ${state.counts.you}`);
  return (
    <div className="flex flex-col gap-1">
      <p className="narrow text-body font-semibold">{state.line1}</p>
      <p className="narrow tnum text-small text-ink-soft">{state.line2}</p>
      <p className="text-small">{part.summary}</p>
      {who.length > 0 && <p className="text-small text-ink-soft">{who.join(" · ")}</p>}
      <p className="text-small font-medium">Click to read the controls.</p>
    </div>
  );
}
