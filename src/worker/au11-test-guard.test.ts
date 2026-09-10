import { describe, expect, it } from "vitest";
import { assertDisposableAu11Database, isDisposableAu11Database } from "./au11-test-guard";

describe("AU-11 disposable database guard", () => {
  it("accepts only the declared test PostgreSQL database on loopback", () => {
    expect(isDisposableAu11Database({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://auditsystems:integration-password@127.0.0.1:5432/auditsystems_test",
    })).toBe(true);
  });

  it.each([
    { NODE_ENV: "production", DATABASE_URL: "postgresql://auditsystems:integration-password@127.0.0.1:5432/auditsystems_test" },
    { NODE_ENV: "test", DATABASE_URL: "postgresql://auditsystems:integration-password@db.example.test:5432/auditsystems_test" },
    { NODE_ENV: "test", DATABASE_URL: "postgresql://auditsystems:integration-password@127.0.0.1:5432/auditsystems" },
    { NODE_ENV: "test" },
  ])("rejects a non-disposable environment", (environment) => {
    expect(isDisposableAu11Database(environment)).toBe(false);
    expect(() => assertDisposableAu11Database(environment)).toThrow("AU11_DISPOSABLE_DATABASE_REQUIRED");
  });
});
