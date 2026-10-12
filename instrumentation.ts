import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Billing date math (the weekly/biweekly cycle grid, toISODate,
    // firstOfNextMonth, getCurrentMonthKey) uses server-local time, while the
    // cron gates on Africa/Cairo. Vercel defaults to UTC, so dev (Cairo) and
    // prod (UTC) disagreed on the day grid and cycle keys. Pin the process to
    // Cairo — the app's billing timezone — so all surfaces share one grid.
    process.env.TZ = "Africa/Cairo";
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
