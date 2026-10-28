/**
 * A drawing stamp: a small double-ruled box. Blueprint blue means approved, redline means it still needs a
 * verifier, ink means published by someone else, and dotted means a sample nobody has confirmed.
 */
type Tone = "approved" | "pending" | "published" | "sample";

const TONES: Record<Tone, string> = {
  approved: "border-blueprint text-blueprint outline-blueprint",
  pending: "border-redline text-redline outline-redline",
  published: "border-ink text-ink outline-ink",
  sample: "border-dotted border-ink-soft text-ink-soft outline-transparent",
};

export function Stamp({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-xs border bg-paper px-1.5 py-px font-display text-small leading-5 font-semibold whitespace-nowrap outline outline-offset-1 ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** A plain label for neutral facts, such as "Optional" or a count. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-xs border border-rule px-1.5 py-px font-display text-small leading-5 font-semibold whitespace-nowrap text-ink-soft">
      {children}
    </span>
  );
}
