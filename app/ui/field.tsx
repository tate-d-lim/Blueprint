import { useId } from "react";

const CONTROL =
  "w-full rounded-xs border border-rule-strong bg-paper px-3 text-body text-ink placeholder:text-ink-soft/70 hover:border-blueprint focus-visible:border-blueprint aria-[invalid=true]:border-redline";

export const inputClass = `${CONTROL} h-10`;
export const selectClass = `${CONTROL} h-10 pr-8`;
export const textareaClass = `${CONTROL} py-2 leading-snug`;

/** A labelled control with an optional hint and error. Every form field in the app goes through this. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display text-body font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-small text-ink-soft">
          {hint}
        </p>
      )}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p id={errorId} className="text-small font-medium text-redline">
          {error}
        </p>
      )}
    </div>
  );
}

/** A checkbox with its label on the right and an optional hint below. */
export function Checkbox({
  label,
  hint,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: React.ReactNode; hint?: React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-body text-ink">
        <input id={id} type="checkbox" className="mt-[3px] size-[18px] shrink-0 cursor-pointer" {...props} />
        <span>{label}</span>
      </label>
      {hint && <div className="pl-[28px] text-small text-ink-soft">{hint}</div>}
    </div>
  );
}

/** A group of radio options under one legend. */
export function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string | undefined;
  options: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-display text-lead font-semibold text-ink">{legend}</legend>
      {Object.entries(options).map(([option, label]) => (
        <label key={option} className="flex cursor-pointer items-center gap-2.5 text-body text-ink">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="size-[18px] shrink-0 cursor-pointer"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
