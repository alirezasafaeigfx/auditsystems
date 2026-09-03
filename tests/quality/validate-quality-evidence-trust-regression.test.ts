import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateQualityEvidence } from "../../scripts/validate-quality-evidence.mjs";

const roots: string[] = [];
const sha = (char: string) => char.repeat(40);
const digest = (body: string) => createHash("sha256").update(body).digest("hex");

function fixture() {
  const rootDir = mkdtempSync(join(tmpdir(), "audit-quality-trust-"));
  roots.push(rootDir);
  const evidence = "evidence\n";
  const transcript = "exit=0 passed=1 failed=0 skipped=0\n";
  const attestation = '{"provider":"github","review":"accepted"}\n';
  writeFileSync(join(rootDir, "evidence.txt"), evidence);
  writeFileSync(join(rootDir, "transcript.txt"), transcript);
  writeFileSync(join(rootDir, "attestation.json"), attestation);
  const candidateSha = sha("b");
  return {
    rootDir,
    manifest: {
      schemaVersion: 1,
      repository: "alirezasafaeigfx/auditsystems",
      baseSha: sha("a"),
      candidateSha,
      capturedAt: "2026-09-03T07:00:00Z",
      sourceDirty: false,
      taskIds: ["AU-08"],
      commands: [{
        id: "focused-tests",
        command: "pnpm test",
        status: "pass",
        exitCode: 0,
        counts: { passed: 1, failed: 0, skipped: 0 },
        transcriptRef: "transcript",
      }],
      criteria: [
        { id: "AU-08-current-state-reconciled", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["evidence"] },
        { id: "AU-08-bounded-baseline", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["evidence"] },
        { id: "AU-08-intent-owner-map", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["evidence"] },
        { id: "AU-08-evidence-validation", scopeSha: candidateSha, verdict: "PASS", evidenceRefs: ["evidence"] },
      ],
      artifacts: [
        { id: "evidence", relativePath: "evidence.txt", sha256: digest(evidence), retrieval: { kind: "local", locator: "evidence.txt" } },
        { id: "transcript", relativePath: "transcript.txt", sha256: digest(transcript), retrieval: { kind: "local", locator: "transcript.txt" } },
        { id: "attestation", relativePath: "attestation.json", sha256: digest(attestation), retrieval: { kind: "local", locator: "attestation.json" } },
      ],
      reviews: [{
        reviewer: "quality-review-bot",
        type: "independent-agent",
        scopeSha: candidateSha,
        disposition: "accepted",
        findings: [],
        attestationRef: "attestation",
        provider: "github-pull-request-review",
        providerUrl: "https://github.com/alirezasafaeigfx/auditsystems/pull/9#pullrequestreview-1234567890",
      }],
      observations: [],
      limitations: [],
    },
  };
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe("quality evidence trust regressions", () => {
  it("rejects directory artifacts as non-regular files without throwing", () => {
    const { rootDir, manifest } = fixture();
    mkdirSync(join(rootDir, "directory-artifact"));
    manifest.artifacts.push({
      id: "directory-artifact",
      relativePath: "directory-artifact",
      sha256: "0".repeat(64),
      retrieval: { kind: "local", locator: "directory-artifact" },
    });

    expect(() => validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).not.toThrow();
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "artifact directory-artifact must resolve to a regular file",
    );
  });
});
