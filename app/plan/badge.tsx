import { Stamp, Tag } from "@/app/ui/stamp";
import { BADGE_TEXT, SAMPLE_BADGE } from "@/lib/plan/labels";
import type { Verification } from "@/lib/plan/verification";

const TONES = {
  verified: "approved",
  "govtech-published": "published",
  "not-yet-verified": "pending",
} as const satisfies Record<Verification, string>;

export function Badge({ verification }: { verification: Verification }) {
  return <Stamp tone={TONES[verification]}>{BADGE_TEXT[verification]}</Stamp>;
}

export function SampleTag() {
  return <Stamp tone="sample">{SAMPLE_BADGE}</Stamp>;
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <Tag>{children}</Tag>;
}
