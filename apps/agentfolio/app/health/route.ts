/**
 * Liveness probe for Railway's healthcheck. Deliberately dependency-free — it
 * must not touch the data layer or trigger the app seed, so it stays fast and
 * green even before Postgres / provisioning are wired.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
