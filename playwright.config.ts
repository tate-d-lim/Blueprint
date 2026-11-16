import { defineConfig } from "@playwright/test";

// Another app on this machine may use 3100. E2E_PORT picks a different port for one run.
const PORT = Number(process.env.E2E_PORT) || 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  // The tests share one database and each starts by resetting it, so they must run one at a time.
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    // A production build on its own port and database, so it never touches the dev server or the demo data.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/start`,
    timeout: 240_000,
    reuseExistingServer: false,
    env: { MONGODB_DB: "buildplan_e2e", CATALOG_AUTO_CHECK: "off" },
  },
});
