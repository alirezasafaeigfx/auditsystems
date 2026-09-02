import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateQualityEvidence } from "../../scripts/validate-quality-evidence.mjs";

const roots: string[] = [];
const sha = (char: string) => char.repeat(40);

function fixture(): { rootDir: string; manifest: any } {
  const rootDir = mkdtempSync(join(tmpdir(), "audit-quality-evidence-"));
  roots.push(rootDir);
  const body = "bounded AU-08 evidence\n";
  writeFileSync(join(rootDir, "evidence.txt"), body);
  const artifactSha = createHash("sha256").update(body).digest("hex");
  const candidateSha = sha("b");
  return {
    rootDir,
    manifest: {
      schemaVersion: 1,
      repository: "alirezasafaeigfx/auditsystems",
      baseSha: sha("a"),
      candidateSha,
      capturedAt: "2026-09-02T18:00:00Z",
      sourceDirty: false,
      taskIds: ["AU-08"],
      commands: [
        {
          id: "focused-tests",
          command: "pnpm exec vitest run tests/quality/validate-quality-evidence.test.ts",
          status: "pass",
          exitCode: 0,
          counts: { passed: 8, failed: 0, skipped: 0 },
        },
      ],
      criteria: [
        { id: "AU-08-current-state-reconciled", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["baseline"] },
        { id: "AU-08-bounded-baseline", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["baseline"] },
        { id: "AU-08-intent-owner-map", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["baseline"] },
        { id: "AU-08-evidence-validation", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["baseline"] },
      ],
      artifacts: [
        {
          id: "baseline",
          relativePath: "evidence.txt",
          sha256: artifactSha,
          retrieval: { kind: "local", locator: "evidence.txt" },
        },
      ],
      reviews: [
        {
          reviewer: "quality-review-bot",
          type: "independent-agent",
          scopeSha: candidateSha,
          disposition: "accepted",
          findings: [],
        },
      ],
      observations: [],
      limitations: [],
    },
  };
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe("AU quality evidence validator", () => {
  it("accepts a complete scoped AU-08 evidence manifest", () => {
    const { rootDir, manifest } = fixture();
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toEqual([]);
  });

  it("rejects unknown task and criterion IDs", () => {
    const { rootDir, manifest } = fixture();
    manifest.taskIds = ["AU-99"];
    manifest.criteria[0].id = "AU-99-invented";
    const errors = validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("unknown task AU-99"),
      expect.stringContaining("unknown criterion AU-99-invented"),
    ]));
  });

  it("rejects an incomplete task criterion set", () => {
    const { rootDir, manifest } = fixture();
    manifest.criteria = manifest.criteria.filter((criterion: any) => criterion.id !== "AU-08-evidence-validation");
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "task AU-08 is missing required criterion AU-08-evidence-validation",
    );
  });

  it("rejects false success from failed or skipped command results", () => {
    const { rootDir, manifest } = fixture();
    manifest.commands[0] = {
      ...manifest.commands[0],
      status: "pass",
      exitCode: 1,
      counts: { passed: 7, failed: 1, skipped: 1 },
    };
    const errors = validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("reports pass with failed or skipped results"),
    ]));
  });

  it("rejects criteria and reviews scoped to a mismatched candidate SHA", () => {
    const { rootDir, manifest } = fixture();
    manifest.criteria[0].scopeSha = sha("c");
    manifest.reviews[0].scopeSha = sha("c");
    const errors = validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("criterion AU-08-current-state-reconciled scopeSha must match candidateSha"),
      expect.stringContaining("review 0 scopeSha must match candidateSha"),
    ]));
  });

  it("rejects missing, traversal, and hash-mismatched artifacts", () => {
    const { rootDir, manifest } = fixture();
    manifest.artifacts[0].relativePath = "../missing.txt";
    manifest.artifacts[0].sha256 = "0".repeat(64);
    const errors = validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining("relative path without traversal"),
      expect.stringContaining("not retrievable"),
    ]));
  });

  it("does not accept self-review as independent acceptance", () => {
    const { rootDir, manifest } = fixture();
    manifest.reviews[0] = {
      reviewer: "implementation-agent",
      type: "self",
      scopeSha: manifest.candidateSha,
      disposition: "accepted",
      findings: [],
    };
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "manifest requires an accepted independent review for candidateSha",
    );
  });

  it("rejects fabricated current ranking observations", () => {
    const { rootDir, manifest } = fixture();
    manifest.observations = [
      {
        type: "search-ranking",
        query: "بررسی سایت",
        observedAt: "2026-09-02T18:00:00Z",
        position: 1,
        source: "synthetic",
      },
    ];
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "search-ranking observations require a retrievable non-synthetic source",
    );
  });
});
