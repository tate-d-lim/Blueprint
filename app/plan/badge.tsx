import { Stamp, Tag } from "@/app/ui/stamp";
import { BADGE_TEXT, SAMPLE_BADGE } from "@/lib/plan/labels";
import type { Verification } from "@/lib/plan/verification";
import { statusLabel, type CoverageStatus } from "@/lib/tool-owner/status";

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

/** One status of a coverage version on the tool owner's list. A stamp marks an exception; the rest stay plain. */
export function StatusMark({ status }: { status: CoverageStatus }) {
  const text = statusLabel(status);
  switch (status.kind) {
    case "verified":
      return <Stamp tone="approved">{text}</Stamp>;
    case "govtech-published":
      return <Stamp tone="published">{text}</Stamp>;
    case "sent-back":
    case "rows-to-check":
      return <Stamp tone="pending">{text}</Stamp>;
    case "waiting":
      return <Tag>{text}</Tag>;
    case "none":
      return <span className="text-small text-ink-soft">{text}</span>;
  }
}
