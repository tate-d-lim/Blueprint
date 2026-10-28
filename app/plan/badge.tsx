import { SgdsBadge } from "@govtechsg/sgds-web-component/react";
import { BADGE_TEXT, SAMPLE_BADGE } from "@/lib/plan/labels";
import type { Verification } from "@/lib/plan/verification";

const VARIANTS = {
  verified: "success",
  "govtech-published": "info",
  "not-yet-verified": "warning",
} as const satisfies Record<Verification, string>;

export function Badge({ verification }: { verification: Verification }) {
  return (
    <SgdsBadge show variant={VARIANTS[verification]}>
      {BADGE_TEXT[verification]}
    </SgdsBadge>
  );
}

export function SampleTag() {
  return (
    <SgdsBadge show variant="neutral">
      {SAMPLE_BADGE}
    </SgdsBadge>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <SgdsBadge show variant="neutral">
      {children}
    </SgdsBadge>
  );
}
