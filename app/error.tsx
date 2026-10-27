"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        If you see a note above about the database, follow it. Otherwise check that Docker and MongoDB are running
        (<code className="font-mono">docker-compose up -d</code>) and that the data is loaded (<code className="font-mono">npm run seed</code>), then try again.
      </p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
        Try again
      </button>
    </div>
  );
}
