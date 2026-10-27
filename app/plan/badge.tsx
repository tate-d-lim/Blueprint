import { BADGE_TEXT, SAMPLE_BADGE } from "@/lib/plan/labels";
import type { Verification } from "@/lib/plan/verification";

const STYLES: Record<Verification, string> = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "govtech-published": "border-sky-200 bg-sky-50 text-sky-800",
  "not-yet-verified": "border-amber-300 bg-amber-50 text-amber-900",
};

const PILL = "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium";

export function Badge({ verification }: { verification: Verification }) {
  return <span className={`${PILL} ${STYLES[verification]}`}>{BADGE_TEXT[verification]}</span>;
}

export function SampleTag() {
  return <span className={`${PILL} border-line bg-background text-muted`}>{SAMPLE_BADGE}</span>;
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className={`${PILL} border-line bg-background text-muted`}>{children}</span>;
}
