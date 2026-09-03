import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateQualityEvidence } from "../../scripts/validate-quality-evidence.mjs";

const roots: string[] = [];
const sha = (char: string) => char.repeat(40);
const digest = (body: string) => createHash("sha256").update(body).digest("hex");

type RankingObservation = {
  type: string;
  query: string;
  observedAt: string;
  position: number;
  source: string;
  snapshotRef?: string;
};

function fixture() {
  const rootDir = mkdtempSync(join(tmpdir(), "audit-quality-evidence-"));
  roots.push(rootDir);
  const body = "bounded AU-08 evidence\n";
  const transcript = "exit=0 passed=8 failed=0 skipped=0\n";
  const reviewAttestation = '{"provider":"github","review":"accepted"}\n';
  writeFileSync(join(rootDir, "evidence.txt"), body);
  writeFileSync(join(rootDir, "command-transcript.txt"), transcript);
  writeFileSync(join(rootDir, "review-attestation.json"), reviewAttestation);
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
          transcriptRef: "command-transcript",
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
          sha256: digest(body),
          retrieval: { kind: "local", locator: "evidence.txt" },
        },
        {
          id: "command-transcript",
          relativePath: "command-transcript.txt",
          sha256: digest(transcript),
          retrieval: { kind: "local", locator: "command-transcript.txt" },
        },
        {
          id: "review-attestation",
          relativePath: "review-attestation.json",
          sha256: digest(reviewAttestation),
          retrieval: { kind: "local", locator: "review-attestation.json" },
        },
      ],
      reviews: [
        {
          reviewer: "quality-review-bot",
          type: "independent-agent",
          scopeSha: candidateSha,
          disposition: "accepted",
          findings: [],
          attestationRef: "review-attestation",
          provider: "github-pull-request-review",
          providerUrl: "https://github.com/alirezasafaeigfx/auditsystems/pull/9#pullrequestreview-1234567890",
        },
      ],
      observations: [] as RankingObservation[],
      limitations: [],
    },
  };
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe("AU quality evidence validator", () => {
  it("rejects a structurally complete but self-authored independent review", () => {
    const { rootDir, manifest } = fixture();
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "review 0 requires provider-verified acceptance",
    );
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
    manifest.criteria = manifest.criteria.filter((criterion) => criterion.id !== "AU-08-evidence-validation");
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

  it("binds passing command results to a hashed execution transcript artifact", () => {
    const { rootDir, manifest } = fixture();
    Reflect.deleteProperty(manifest.commands[0], "transcriptRef");
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "command focused-tests must reference a trusted execution transcript artifact",
    );
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
      attestationRef: "review-attestation",
      provider: "github-pull-request-review",
      providerUrl: "https://github.com/alirezasafaeigfx/auditsystems/pull/9#pullrequestreview-1234567890",
    };
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "manifest requires an accepted independent review for candidateSha",
    );
  });

  it("requires an authenticated provider attestation for independent review acceptance", () => {
    const { rootDir, manifest } = fixture();
    Reflect.deleteProperty(manifest.reviews[0], "attestationRef");
    Reflect.deleteProperty(manifest.reviews[0], "providerUrl");
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "review 0 must reference an authenticated review-provider attestation",
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

  it("binds ranking observations to a hashed retrieved snapshot artifact", () => {
    const { rootDir, manifest } = fixture();
    manifest.observations = [
      {
        type: "search-ranking",
        query: "site audit",
        observedAt: "2026-09-02T18:00:00Z",
        position: 7,
        source: "https://search.example/snapshot/123",
      },
    ];
    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "search-ranking observations require a trusted snapshot artifact reference",
    );
  });

  it("rejects a dirty checkout even when the manifest claims sourceDirty false", () => {
    const { rootDir, manifest } = fixture();
    execFileSync("git", ["init"], { cwd: rootDir });
    execFileSync("git", ["config", "user.email", "quality@example.com"], { cwd: rootDir });
    execFileSync("git", ["config", "user.name", "Quality Test"], { cwd: rootDir });
    execFileSync("git", ["add", "."], { cwd: rootDir });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: rootDir });
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
    manifest.baseSha = head;
    manifest.candidateSha = head;
    manifest.criteria = manifest.criteria.map((criterion) => ({ ...criterion, scopeSha: head }));
    manifest.reviews = manifest.reviews.map((review) => ({ ...review, scopeSha: head }));
    writeFileSync(join(rootDir, "dirty.txt"), "dirty\n");
    expect(validateQualityEvidence(manifest, { rootDir })).toContain(
      "checked-out source must be clean when sourceDirty is false",
    );
  });
});
