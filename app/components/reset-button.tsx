import { Button } from "@/app/ui/button";
import { Note } from "@/app/ui/note";

/**
 * Puts the seed files back. It works with no script: the summary opens a confirm step that says what is lost, and only
 * the button inside it posts. Closing the step posts nothing.
 */
export function ResetButton() {
  return (
    <details className="group max-w-measure">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center rounded-sm border border-rule-strong bg-paper px-4 text-body font-semibold text-ink hover:border-ink hover:bg-ground group-open:border-ink group-open:bg-ground [&::-webkit-details-marker]:hidden">
        Reset data
      </summary>
      <form action="/api/reset" method="post" className="mt-4">
        <Note tone="attention" title="Resetting deletes your changes.">
          <p>
            Blueprint loads the seed files again. This deletes saved projects, new tool versions and approvals, applied catalog releases, and plain text you
            wrote. It cannot be undone.
          </p>
          <div className="mt-3">
            <Button type="submit" variant="danger">
              Reset all data
            </Button>
          </div>
        </Note>
      </form>
    </details>
  );
}
