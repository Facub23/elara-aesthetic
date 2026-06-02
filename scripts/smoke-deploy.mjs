const args = process.argv.slice(2);
const withCrons = args.includes("--with-crons");
const targetUrl = args.find((arg) => !arg.startsWith("--"));
const baseUrl = (targetUrl || process.env.NEXT_PUBLIC_SITE_URL || "")
  .trim()
  .replace(/\/$/, "");

if (!baseUrl) {
  console.error("Usage: npm run smoke:deploy -- https://your-public-url");
  process.exit(1);
}

const publicRoutes = [
  "/",
  "/clinics",
  "/tratamientos",
  "/especialistas",
  "/sitemap.xml",
  "/robots.txt",
];

const publicIndexableRoutes = [
  "/",
  "/clinics",
  "/tratamientos",
  "/especialistas",
];

const privateNoindexRoutes = [
  "/admin",
  "/login",
  "/mi-cuenta",
  "/dashboard",
  "/cancel-booking",
  "/confirm-booking",
  "/api/public-marketplace-data",
];

const cronRoutes = [
  "/api/expire-pending-bookings",
  "/api/send-booking-reminders",
  "/api/auto-complete-bookings",
];

function absoluteUrl(path) {
  return `${baseUrl}${path}`;
}

async function checkRoute(path) {
  const response = await fetch(absoluteUrl(path), {
    redirect: "manual",
  });

  return {
    path,
    status: response.status,
    ok: response.status >= 200 && response.status < 400,
  };
}

async function checkIndexableRoute(path) {
  const response = await fetch(absoluteUrl(path), {
    redirect: "manual",
  });
  const robotsHeader = response.headers.get("x-robots-tag") || "";

  return {
    path,
    status: response.status,
    ok:
      response.status >= 200 &&
      response.status < 400 &&
      !robotsHeader.toLowerCase().includes("noindex"),
    check: "indexable",
    header: robotsHeader,
  };
}

async function checkNoindexRoute(path) {
  const response = await fetch(absoluteUrl(path), {
    redirect: "manual",
  });
  const robotsHeader = response.headers.get("x-robots-tag") || "";

  return {
    path,
    status: response.status,
    ok: robotsHeader.toLowerCase().includes("noindex"),
    check: "noindex",
    header: robotsHeader,
  };
}

async function checkMarketplaceApi() {
  const response = await fetch(absoluteUrl("/api/public-marketplace-data"), {
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  return {
    path: "/api/public-marketplace-data",
    status: response.status,
    ok:
      response.ok &&
      Array.isArray(data.clinics) &&
      Array.isArray(data.specialists) &&
      Array.isArray(data.reviews),
    counts: {
      clinics: Array.isArray(data.clinics) ? data.clinics.length : 0,
      specialists: Array.isArray(data.specialists) ? data.specialists.length : 0,
      reviews: Array.isArray(data.reviews) ? data.reviews.length : 0,
    },
  };
}

async function checkCronProtection(path) {
  const response = await fetch(absoluteUrl(path), {
    redirect: "manual",
  });

  return {
    path,
    status: response.status,
    ok: response.status === 401,
  };
}

async function checkCronSecret(path) {
  if (!withCrons || !process.env.CRON_SECRET) {
    return null;
  }

  const response = await fetch(absoluteUrl(path), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
  const body = await response.text();

  return {
    path,
    status: response.status,
    ok: response.ok,
    body: body.slice(0, 240),
  };
}

const results = [];

for (const route of publicRoutes) {
  results.push(await checkRoute(route));
}

for (const route of publicIndexableRoutes) {
  results.push(await checkIndexableRoute(route));
}

for (const route of privateNoindexRoutes) {
  results.push(await checkNoindexRoute(route));
}

results.push(await checkMarketplaceApi());

for (const route of cronRoutes) {
  results.push(await checkCronProtection(route));
}

for (const route of cronRoutes) {
  const result = await checkCronSecret(route);
  if (result) results.push(result);
}

const failed = results.filter((result) => !result.ok);

console.table(
  results.map((result) => ({
    path: result.path,
    check: result.check || "",
    status: result.status,
    ok: result.ok ? "OK" : "FAIL",
    header: result.header || "",
    counts: result.counts ? JSON.stringify(result.counts) : "",
  }))
);

if (failed.length > 0) {
  console.error(`Smoke deploy failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log("Smoke deploy passed.");
