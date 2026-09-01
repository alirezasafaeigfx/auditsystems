type QualificationResult =
  | { ok: true }
  | { ok: false; code: string };

type Request = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

export async function submitQualification(
  payload: Record<string, unknown>,
  request: Request = fetch,
): Promise<QualificationResult> {
  let response: Pick<Response, "ok" | "json">;
  try {
    response = await request("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, code: "NETWORK_ERROR" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, code: "INVALID_RESPONSE" };
  }

  if (!response.ok) {
    const code = typeof body === "object" && body !== null && "error" in body
      ? String(body.error)
      : "REQUEST_FAILED";
    return { ok: false, code };
  }

  return { ok: true };
}
