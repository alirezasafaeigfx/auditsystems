type Environment = Record<string, string | undefined>;

const expectedDatabaseName = "/auditsystems_test";
const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function isDisposableAu11Database(environment: Environment): boolean {
  if (environment.NODE_ENV !== "test" || !environment.DATABASE_URL) return false;
  try {
    const databaseUrl = new URL(environment.DATABASE_URL);
    return (
      (databaseUrl.protocol === "postgresql:" || databaseUrl.protocol === "postgres:") &&
      loopbackHosts.has(databaseUrl.hostname.toLowerCase()) &&
      decodeURIComponent(databaseUrl.pathname) === expectedDatabaseName
    );
  } catch {
    return false;
  }
}

export function assertDisposableAu11Database(environment: Environment): void {
  if (!isDisposableAu11Database(environment)) throw new Error("AU11_DISPOSABLE_DATABASE_REQUIRED");
}
