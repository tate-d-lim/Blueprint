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
      <button type="submit" className="rounded-md border border-line px-3 py-1 text-sm text-muted hover:text-foreground">
        Reset demo data
      </button>
    </form>
  );
}
