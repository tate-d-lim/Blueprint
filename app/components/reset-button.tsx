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
        className="h-9 rounded-xs border border-paper/60 px-3 font-display text-body font-semibold whitespace-nowrap text-paper hover:border-paper hover:bg-blueprint-deep"
      >
        Reset demo data
      </button>
    </form>
  );
}
