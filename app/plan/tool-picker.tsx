"use client";

import { SgdsAccordion, SgdsAccordionItem, SgdsAlert, SgdsBadge, SgdsButton, SgdsCard, SgdsCheckbox } from "@govtechsg/sgds-web-component/react";
import { checkedOf } from "@/app/components/sgds-events";
import type { Section, Tool } from "@/lib/domain/types";
import type { ToolHint } from "@/lib/plan/engine";
import { HINT_TEXT } from "@/lib/plan/labels";
import type { Verification } from "@/lib/plan/verification";
import { Badge, SampleTag } from "./badge";

const SECTIONS: { id: Section; title: string }[] = [
  { id: "cpf", title: "CPF tools" },
  { id: "wog", title: "Whole-of-government tools" },
  { id: "code", title: "Code components" },
];

/** "appCentral expects DBaaS": shown once, above the picker, whichever way the picker is laid out. */
export function ToolHints({ tools, hints, onToggle }: { tools: Tool[]; hints: ToolHint[]; onToggle: (toolId: string) => void }) {
  const nameOf = (id: string) => tools.find(t => t._id === id)?.name ?? id;
  return hints.map(h => (
    <SgdsAlert key={`${h.fromToolId}>${h.suggestToolId}`} show outlined variant="warning">
      <p>{HINT_TEXT(nameOf(h.fromToolId), nameOf(h.suggestToolId), h.count)}</p>
      <SgdsButton slot="action" size="sm" onClick={() => onToggle(h.suggestToolId)}>
        Add {nameOf(h.suggestToolId)}
      </SgdsButton>
    </SgdsAlert>
  ));
}

export function ToolPicker({
  tools,
  picked,
  verification,
  onToggle,
  collapsed = false,
}: {
  tools: Tool[];
  picked: string[];
  verification: Record<string, Verification | null>;
  onToggle: (toolId: string) => void;
  /** On phones the list folds away so the plan isn't pushed off the screen. */
  collapsed?: boolean;
}) {
  const groupsView = SECTIONS.map(section => {
    const inSection = tools.filter(t => t.section === section.id);
    if (inSection.length === 0) return null;
    return (
      <section key={section.id} className="sgds:flex sgds:flex-col sgds:gap-text-sm">
        <h3 className="sgds:text-label-md sgds:font-semibold sgds:text-subtle">{section.title}</h3>
        <ul className="sgds:flex sgds:flex-col sgds:gap-sm">
          {inSection.map(tool => (
            <li key={tool._id} className="sgds:flex sgds:flex-col sgds:gap-text-xs">
              <SgdsCheckbox
                name={tool._id}
                value={tool._id}
                checked={picked.includes(tool._id)}
                onSgdsChange={e => checkedOf(e) !== picked.includes(tool._id) && onToggle(tool._id)}
              >
                {tool.name}
              </SgdsCheckbox>
              <div className="sgds:flex sgds:flex-col sgds:gap-text-xs sgds:pl-layout-md">
                {tool.description && <p className="sgds:text-body-sm sgds:text-subtle">{tool.description}</p>}
                <div className="sgds:flex sgds:flex-wrap sgds:gap-text-xs">
                  {tool.isSample && <SampleTag />}
                  {verification[tool._id] && <Badge verification={verification[tool._id]!} />}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  });

  if (collapsed) {
    return (
      <SgdsAccordion>
        <SgdsAccordionItem>
          <span slot="header" className="sgds:text-subtitle-md sgds:font-semibold">
            Pick your tools
          </span>
          <SgdsBadge slot="badge" show variant="neutral">
            {picked.length} picked
          </SgdsBadge>
          <div slot="content" className="sgds:flex sgds:flex-col sgds:gap-layout-sm">
            <p className="sgds:text-body-sm sgds:text-subtle">Tick what your app will use. Your plan updates as you go.</p>
            {groupsView}
          </div>
        </SgdsAccordionItem>
      </SgdsAccordion>
    );
  }

  return (
    <SgdsCard>
      <div slot="title" className="sgds:flex sgds:flex-col sgds:gap-text-xs sgds:pb-sm">
        <h2 className="sgds:text-subtitle-md sgds:font-semibold">Pick your tools</h2>
        <p className="sgds:text-body-sm sgds:font-regular sgds:text-subtle">Tick what your app will use. Your plan updates as you go.</p>
      </div>
      <div className="sgds:flex sgds:flex-col sgds:gap-layout-sm">{groupsView}</div>
    </SgdsCard>
  );
}
