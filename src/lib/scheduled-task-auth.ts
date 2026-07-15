export async function isScheduledTaskAuthorized(req: Request) {
  const expectedSecret =
    process.env.CRON_SECRET || process.env.REMINDER_CRON_SECRET;
  const authorization = req.headers.get("authorization") || "";
  const providedSecret = authorization.replace(/^Bearer\s+/i, "");

  if (expectedSecret && providedSecret === expectedSecret) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && !expectedSecret;
}
