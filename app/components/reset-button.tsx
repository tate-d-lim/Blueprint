"use client";

export function ResetButton() {
  return (
    <form
      action="/api/reset"
      method="post"
      onSubmit={e => {
        if (!confirm("Reset all demo data? Saved projects and coverage edits will be lost.")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="h-9 rounded-sm border border-rule-strong bg-paper px-3 text-small font-semibold whitespace-nowrap text-ink hover:border-ink"
      >
        Reset demo data
      </button>
    </form>
  );
}
