"use client";

import { Button } from "@/app/ui/button";
import { Note } from "@/app/ui/note";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-message">
      <Note
        tone="error"
        title="Something went wrong"
        action={
          <Button size="sm" variant="secondary" onClick={reset}>
            Try again
          </Button>
        }
      >
        If you see a note above about the database, follow it. Otherwise check that Docker and MongoDB are running (
        <code className="font-code text-small">docker-compose up -d</code>) and that the data is loaded (
        <code className="font-code text-small">npm run seed</code>), then try again.
      </Note>
    </div>
  );
}
