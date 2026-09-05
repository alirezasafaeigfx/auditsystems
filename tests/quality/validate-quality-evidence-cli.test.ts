import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const cli = resolve("scripts/validate-quality-evidence.mjs");

function root() {
  const value = mkdtempSync(join(tmpdir(), "audit-quality-cli-"));
  roots.push(value);
  return value;
}

function run(args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
}

afterEach(() => {
  roots.splice(0).forEach((value) => rmSync(value, { recursive: true, force: true }));
});

describe("quality evidence CLI input failures", () => {
  it("reports a missing --manifest option without a stack trace", () => {
    const result = run(["--root", root()]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("manifest could not be loaded:");
    expect(result.stderr).not.toContain("    at ");
  });

  it("reports an unreadable manifest file without a stack trace", () => {
    const rootDir = root();
    const result = run(["--root", rootDir, "--manifest", "missing.json"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("manifest could not be loaded:");
    expect(result.stderr).not.toContain("    at ");
  });

  it("reports malformed manifest JSON without a stack trace", () => {
    const rootDir = root();
    writeFileSync(join(rootDir, "manifest.json"), "{not-json\n");
    const result = run(["--root", rootDir, "--manifest", "manifest.json"]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("manifest could not be loaded:");
    expect(result.stderr).not.toContain("    at ");
  });
});
