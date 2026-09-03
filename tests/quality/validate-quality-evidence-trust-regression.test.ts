import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  validateQualityEvidence,
  validateQualityEvidenceWithProviders,
} from "../../scripts/validate-quality-evidence.mjs";

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
      observations: [] as Array<Record<string, unknown>>,
      limitations: [],
    },
  };
}

function makeProviderCommand(manifest: ReturnType<typeof fixture>["manifest"], runId = 123456789) {
  Object.assign(manifest.commands[0], {
    id: "hosted-quality-gate",
    command: "pnpm run automation:run",
    provider: "github-actions-run",
    providerUrl: `https://github.com/alirezasafaeigfx/auditsystems/actions/runs/${runId}`,
    providerJob: "Self-hosted quality gate",
    providerStep: "Run automation hard gate",
  });
  return runId;
}

function providerResponse(url: string, manifest: ReturnType<typeof fixture>["manifest"], runId: number) {
  const review = manifest.reviews[0];
  if (url.endsWith("/pulls/9/reviews/1234567890")) {
    return new Response(JSON.stringify({
      id: 1234567890,
      html_url: review.providerUrl,
      user: { login: review.reviewer },
      state: "APPROVED",
      commit_id: manifest.candidateSha,
    }), { status: 200 });
  }
  if (url.endsWith("/pulls/9")) {
    return new Response(JSON.stringify({
      number: 9,
      user: { login: "implementation-author" },
      head: { sha: manifest.candidateSha },
    }), { status: 200 });
  }
  if (url.endsWith(`/actions/runs/${runId}`)) {
    return new Response(JSON.stringify({
      id: runId,
      name: "main-gate",
      path: ".github/workflows/main-gate.yml",
      event: "pull_request",
      status: "completed",
      conclusion: "success",
      head_sha: manifest.candidateSha,
      repository: { full_name: manifest.repository },
    }), { status: 200 });
  }
  if (url.endsWith(`/actions/runs/${runId}/jobs`)) {
    return new Response(JSON.stringify({
      jobs: [{
        name: "Self-hosted quality gate",
        status: "completed",
        conclusion: "success",
        steps: [{ name: "Run automation hard gate", status: "completed", conclusion: "success" }],
      }],
    }), { status: 200 });
  }
  if (url.includes("/contents/.github/workflows/main-gate.yml?ref=")) {
    return new Response(JSON.stringify({ sha: sha("c") }), { status: 200 });
  }
  return new Response("not found", { status: 404 });
}

afterEach(() => {
  vi.unstubAllGlobals();
  roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true }));
});

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

  it("rejects a retrievable artifact whose SHA-256 does not match its file", () => {
    const { rootDir, manifest } = fixture();
    const artifact = manifest.artifacts.find((candidate) => candidate.id === "evidence");
    if (!artifact) throw new Error("missing evidence fixture");
    artifact.sha256 = "0".repeat(64);

    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "artifact evidence SHA-256 does not match its file",
    );
  });

  it("rejects a correctly hashed transcript whose result conflicts with the command claim", () => {
    const { rootDir, manifest } = fixture();
    const failingTranscript = "exit=1 passed=0 failed=1 skipped=0\n";
    writeFileSync(join(rootDir, "transcript.txt"), failingTranscript);
    const transcriptArtifact = manifest.artifacts.find((artifact) => artifact.id === "transcript");
    if (!transcriptArtifact) throw new Error("missing transcript fixture");
    transcriptArtifact.sha256 = digest(failingTranscript);

    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "command focused-tests transcript does not match declared result",
    );
  });

  it("rejects a matching self-authored transcript without provider-verified execution", () => {
    const { rootDir, manifest } = fixture();

    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "command focused-tests requires provider-verified execution",
    );
  });

  it("rejects a successful provider run when a trusted gate definition changed", async () => {
    const { rootDir, manifest } = fixture();
    const runId = makeProviderCommand(manifest);

    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/git/trees/") && url.includes(manifest.baseSha)) {
        return new Response(JSON.stringify({
          truncated: false,
          tree: [
            { path: ".github/workflows/main-gate.yml", type: "blob", sha: sha("c") },
            { path: "package.json", type: "blob", sha: sha("d") },
            { path: "src/scripts/automation-master.ts", type: "blob", sha: sha("e") },
          ],
        }), { status: 200 });
      }
      if (url.includes("/git/trees/") && url.includes(manifest.candidateSha)) {
        return new Response(JSON.stringify({
          truncated: false,
          tree: [
            { path: ".github/workflows/main-gate.yml", type: "blob", sha: sha("c") },
            { path: "package.json", type: "blob", sha: sha("f") },
            { path: "src/scripts/automation-master.ts", type: "blob", sha: sha("e") },
          ],
        }), { status: 200 });
      }
      return providerResponse(url, manifest, runId);
    }));

    const errors = await validateQualityEvidenceWithProviders(manifest, { rootDir, verifyGitIdentity: false });
    expect(errors).toContain("command hosted-quality-gate requires provider-verified execution");
  });

  it("reports provider unavailability separately from invalid provider evidence", async () => {
    const { rootDir, manifest } = fixture();
    const runId = makeProviderCommand(manifest);

    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith(`/actions/runs/${runId}`)) return new Response("rate limited", { status: 429 });
      return providerResponse(url, manifest, runId);
    }));

    const errors = await validateQualityEvidenceWithProviders(manifest, { rootDir, verifyGitIdentity: false });
    expect(errors).toContain("command hosted-quality-gate provider verification unavailable");
  });

  it("rejects unsupported observation types instead of silently skipping them", () => {
    const { rootDir, manifest } = fixture();
    manifest.observations = [{ type: "invented-observation", source: "https://example.com/evidence" }];

    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "unknown observation type invented-observation",
    );
  });

  it("rejects a correctly hashed ranking snapshot whose contents conflict with the observation", () => {
    const { rootDir, manifest } = fixture();
    const snapshot = `${JSON.stringify({
      query: "site audit",
      observedAt: "2026-09-03T07:00:00Z",
      position: 9,
      source: "https://search.example/results/site-audit",
    })}\n`;
    writeFileSync(join(rootDir, "ranking-snapshot.json"), snapshot);
    manifest.artifacts.push({
      id: "ranking-snapshot",
      relativePath: "ranking-snapshot.json",
      sha256: digest(snapshot),
      retrieval: { kind: "local", locator: "ranking-snapshot.json" },
    });
    manifest.observations = [{
      type: "search-ranking",
      query: "site audit",
      observedAt: "2026-09-03T07:00:00Z",
      position: 1,
      source: "https://search.example/results/site-audit",
      snapshotRef: "ranking-snapshot",
    }];

    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "search-ranking observation snapshot does not match declared result",
    );
  });

  it("rejects a matching self-authored ranking snapshot without provider verification", () => {
    const { rootDir, manifest } = fixture();
    const snapshot = `${JSON.stringify({
      query: "site audit",
      observedAt: "2026-09-03T07:00:00Z",
      position: 7,
      source: "https://search.example/results/site-audit",
    })}\n`;
    writeFileSync(join(rootDir, "ranking-snapshot.json"), snapshot);
    manifest.artifacts.push({
      id: "ranking-snapshot",
      relativePath: "ranking-snapshot.json",
      sha256: digest(snapshot),
      retrieval: { kind: "local", locator: "ranking-snapshot.json" },
    });
    manifest.observations = [{
      type: "search-ranking",
      query: "site audit",
      observedAt: "2026-09-03T07:00:00Z",
      position: 7,
      source: "https://search.example/results/site-audit",
      snapshotRef: "ranking-snapshot",
    }];

    expect(validateQualityEvidence(manifest, { rootDir, verifyGitIdentity: false })).toContain(
      "search-ranking observation requires provider-verified snapshot",
    );
  });
});