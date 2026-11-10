import { Badge, SampleTag } from "@/app/plan/badge";
import { Checkbox } from "@/app/ui/field";
import type { Tool } from "@/lib/domain/types";
import type { Verification } from "@/lib/plan/verification";

/** One tool: the tick, what it is, when it is part of the app, and both sides of what it does for this app. */
export function ToolRow({
  tool,
  checked,
  verification,
  effect,
  onToggle,
}: {
  tool: Tool;
  checked: boolean;
  verification: Verification | null;
  effect: string;
  onToggle: () => void;
}) {
  return (
    <li data-tool-id={tool._id} className="border-b border-rule py-4 first:pt-0 last:border-b-0">
      <Checkbox
        name={tool._id}
        label={<span className="font-semibold">{tool.name}</span>}
        checked={checked}
        onChange={onToggle}
        hint={
          <div className="flex flex-col gap-1.5">
            {(tool.isSample || verification) && (
              <span className="flex flex-wrap gap-2">
                {tool.isSample && <SampleTag />}
                {verification && <Badge verification={verification} />}
              </span>
            )}
            <span>It is part of your app if {tool.partOfAppWhen}</span>
            <span className="font-medium text-ink">{effect}</span>
          </div>
        }
      />
    </li>
  );
}
