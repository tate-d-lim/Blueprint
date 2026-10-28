"use client";

import {
  SgdsCard,
  SgdsDescriptionList,
  SgdsDescriptionListGroup,
  SgdsDrawer,
} from "@govtechsg/sgds-web-component/react";
import type { ProfileEntry } from "@/lib/domain/types";
import type { PlanItem } from "@/lib/plan/engine";
import { resolveParameters } from "@/lib/plan/format";
import { VALUE_LABEL } from "@/lib/plan/labels";
import { Badge } from "./badge";

/** The side panel with the official wording and what each picked tool says. The drawer handles Escape and focus. */
export function ItemDetail({
  item,
  entry,
  open,
  onClose,
}: {
  item: PlanItem;
  entry?: ProfileEntry;
  open: boolean;
  onClose: () => void;
}) {
  const title = item.plain?.title ?? item.title;
  return (
    <SgdsDrawer open={open} size="lg" ariaLabel={title} onSgdsAfterHide={onClose}>
      <div slot="title" className="sgds:flex sgds:flex-col sgds:gap-text-xs">
        <h2 className="sgds:text-heading-sm sgds:font-semibold">{title}</h2>
        <p className="sgds:font-code sgds:text-caption-md sgds:text-subtle">{item.id}</p>
      </div>

      <div className="sgds:flex sgds:flex-col sgds:gap-layout-sm">
        <p className="sgds:text-subtle">{item.reason}</p>

        <section className="sgds:flex sgds:flex-col sgds:gap-text-sm">
          <h3 className="sgds:text-subtitle-md sgds:font-semibold">Official wording</h3>
          {entry ? (
            <SgdsDescriptionListGroup stacked bordered>
              <Field label="Requirement" text={entry.statement} />
              <Field label="Recommendations" text={entry.recommendations} />
              <Field label="Why it matters (official)" text={entry.rationale} />
              <Field label="References" text={entry.references} />
            </SgdsDescriptionListGroup>
          ) : (
            <p className="sgds:text-subtle">The official wording isn&apos;t available.</p>
          )}
        </section>

        <section className="sgds:flex sgds:flex-col sgds:gap-text-sm">
          <h3 className="sgds:text-subtitle-md sgds:font-semibold">What your tools say</h3>
          {item.claims.length === 0 ? (
            <p className="sgds:text-subtle">None of the tools you picked say anything about this one.</p>
          ) : (
            <ul className="sgds:flex sgds:flex-col sgds:gap-sm">
              {item.claims.map(c => (
                <li key={c.toolId}>
                  <SgdsCard>
                    <div slot="title" className="sgds:flex sgds:flex-wrap sgds:items-center sgds:justify-between sgds:gap-sm">
                      <span className="sgds:text-subtitle-md sgds:font-semibold">{c.toolName}</span>
                      <Badge verification={c.verification} />
                    </div>
                    <div className="sgds:flex sgds:flex-col sgds:gap-text-sm sgds:text-body-sm">
                      <p>{VALUE_LABEL(c.value, c.toolName, c.otherToolName)}</p>
                      {c.explanation && <p className="sgds:text-subtle">{c.explanation}</p>}
                      {c.builderPart && (
                        <p>
                          <strong>App Builder&apos;s part: </strong>
                          {c.builderPart}
                        </p>
                      )}
                      <p className="sgds:text-caption-md sgds:text-subtle">Source: {c.source}</p>
                    </div>
                  </SgdsCard>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SgdsDrawer>
  );
}

function Field({ label, text }: { label: string; text: string }) {
  if (!text.trim()) return null;
  return (
    <SgdsDescriptionList stacked bordered>
      {label}
      <span slot="data" className="sgds:whitespace-pre-line">
        {resolveParameters(text)}
      </span>
    </SgdsDescriptionList>
  );
}
