import { getCSRFTokenForClient } from "../../../lib/csrf";
import { createRequestId, respondJson } from "../../../lib/observability";

export async function GET() {
  const requestId = createRequestId();

  try {
    const { token, headerName } = getCSRFTokenForClient();
    return respondJson({ token, headerName, requestId }, requestId, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch {
    return respondJson({ token: null, headerName: "x-csrf-token", requestId }, requestId, {
      headers: { "Cache-Control": "no-store" }
    });
  }
}
