"use client";

import { useEffect, useId, useRef } from "react";

/**
 * A modal sheet on the native <dialog>, so Escape, focus trapping and the backdrop come from the browser.
 * "side" opens it as a full-height panel from the right, for detail views. The title is an h2 at the
 * panel-title size, and names the dialog for screen readers.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  side = false,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  side?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const frame = side
    ? "ml-auto mr-0 h-dvh max-h-dvh w-[min(720px,92vw)] border-l"
    : "m-auto w-[min(560px,92vw)] border";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={e => e.target === e.currentTarget && onClose()}
      className={`${frame} border-ink bg-paper p-0 text-left whitespace-normal text-ink backdrop:bg-ink/35`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="text-title font-semibold text-ink">
              {title}
            </h2>
            {description && <p className="tnum text-small text-ink-soft">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-rule-strong text-ink hover:bg-ground"
          >
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-rule px-6 py-4">{footer}</div>}
      </div>
    </dialog>
  );
}
