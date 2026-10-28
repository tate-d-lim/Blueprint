"use client";

import { SgdsAlert, SgdsButton } from "@govtechsg/sgds-web-component/react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="sgds:mx-auto sgds:max-w-container-md">
      <SgdsAlert show outlined variant="warning" title="Something went wrong">
        <div className="sgds:flex sgds:flex-col sgds:gap-sm">
          <p>
            If you see a note above about the database, follow it. Otherwise check that Docker and MongoDB are running
            (<code>docker-compose up -d</code>) and that the data is loaded (<code>npm run seed</code>), then try again.
          </p>
          <div>
            <SgdsButton size="sm" onClick={reset}>
              Try again
            </SgdsButton>
          </div>
        </div>
      </SgdsAlert>
    </div>
  );
}
