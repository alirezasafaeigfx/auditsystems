type CSRFTokenResponse = {
  token: string;
  headerName: string;
};

let cachedPromise: Promise<CSRFTokenResponse> | null = null;

export async function fetchCSRFHeaders(): Promise<Record<string, string>> {
  try {
    const data = await getCSRFToken();
    return { [data.headerName]: data.token };
  } catch {
    return {};
  }
}

async function getCSRFToken(): Promise<CSRFTokenResponse> {
  if (!cachedPromise) {
    cachedPromise = fetch("/api/csrf", { cache: "no-store" })
      .then((res) => res.json() as Promise<CSRFTokenResponse>)
      .catch(() => ({ token: "", headerName: "x-csrf-token" }));
  }
  return cachedPromise;
}

export function resetCSRFToken(): void {
  cachedPromise = null;
}
