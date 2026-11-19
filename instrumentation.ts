/** Runs once when the server starts. It starts the daily check of the GovTech catalog (Node.js runtime only). */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startDailyCheck } = await import("./lib/catalog/schedule");
    startDailyCheck();
  }
}
