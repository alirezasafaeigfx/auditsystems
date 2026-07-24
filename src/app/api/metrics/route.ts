import { renderPrometheusMetrics } from "../../../lib/metrics";
import { validateAdminSession } from "../../../lib/admin-auth";

export async function GET() {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(renderPrometheusMetrics(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
