import { defineConfig } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    // A production build on its own port and database, so it never touches the dev server or the demo data.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/start`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { MONGODB_DB: "buildplan_e2e" },
  },
});
