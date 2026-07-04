import { validateSession } from "../../../../lib/auth";
import { createRequestId, respondJson } from "../../../../lib/observability";

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ authenticated: false, requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return respondJson({ authenticated: true, user, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return respondJson({ authenticated: false, requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}
