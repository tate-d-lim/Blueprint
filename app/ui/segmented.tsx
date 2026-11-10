/**
 * A ruled strip of choices, divided like the cells of a title block. The chosen one is washed and underlined in
 * ink. `value` may be null when nothing is chosen yet.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-fit divide-x divide-rule-strong rounded-sm border border-rule-strong bg-paper">
      {options.map(option => {
        const chosen = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={chosen}
            onClick={() => onChange(option.value)}
            className={`h-9 cursor-pointer border-b-2 px-4 text-small font-semibold transition-colors ${
              chosen ? "border-b-ink bg-ground text-ink" : "border-b-transparent text-ink-soft hover:bg-ground hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
