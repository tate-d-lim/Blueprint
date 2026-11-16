"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/app/ui/button";
import { autoCheckAction, checkNowAction } from "./actions";

/**
 * The "Check GovTech now" button, and the check that starts by itself after the page shows when the last one is more
 * than 24 hours old. The page never waits for it: the check runs after the first render, and the page refreshes when it ends.
 */
export function GovtechCheck({ due }: { due: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [auto, setAuto] = useState(false);
  const [message, setMessage] = useState<string>();
  const started = useRef(false);

  useEffect(() => {
    if (!due || started.current) return;
    started.current = true;
    setAuto(true);
    void autoCheckAction()
      .catch(() => undefined)
      .finally(() => {
        setAuto(false);
        router.refresh();
      });
  }, [due, router]);

  const busy = pending || auto;
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setMessage(undefined);
            const r = await checkNowAction();
            setMessage(r.ok ? r.message : r.error);
            router.refresh();
          })
        }
      >
        Check GovTech now
      </Button>
      <p role="status" className="min-h-5 text-small text-ink-soft">
        {busy ? "Checking GovTech…" : message}
      </p>
    </div>
  );
}
