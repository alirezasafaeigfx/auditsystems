import { describe, expect, it } from "vitest";
import { validateQualityEvidence } from "../../scripts/validate-quality-evidence.mjs";

const sha = (char: string) => char.repeat(40);

describe("AU quality evidence inherited task identifiers", () => {
  it("returns an unknown-task validation error for Object.prototype keys", () => {
    const manifest = {
      schemaVersion: 1,
      repository: "alirezasafaeigfx/auditsystems",
      baseSha: sha("a"),
      candidateSha: sha("b"),
      capturedAt: "2026-09-05T19:00:00Z",
      sourceDirty: false,
      taskIds: ["constructor"],
      commands: [],
      criteria: [],
      artifacts: [],
      reviews: [],
      observations: [],
      limitations: [],
    };

    const errors = validateQualityEvidence(manifest, { verifyGitIdentity: false });
    expect(errors).toContain("unknown task constructor");
  });
});
