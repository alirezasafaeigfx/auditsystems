import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const SHA = /^[0-9a-f]{40}$/i;
const HASH = /^[0-9a-f]{64}$/i;
const GITHUB_PR_REVIEW_URL = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+#pullrequestreview-\d+$/i;
const REQUIRED_CRITERIA = {
  "AU-08": [
    "AU-08-current-state-reconciled",
    "AU-08-bounded-baseline",
    "AU-08-intent-owner-map",
    "AU-08-evidence-validation",
  ],
};
const KNOWN_CRITERIA = new Set(Object.values(REQUIRED_CRITERIA).flat());

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

function validTimestamp(value) {
  const match = typeof value === "string"
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/)
    : null;
  if (!match) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second;
}

function isInside(rootDir, target) {
  const fromRoot = relative(rootDir, target);
  return fromRoot === "" || (!fromRoot.startsWith("..") && !isAbsolute(fromRoot));
}

function validateCommand(command, index, errors) {
  const id = nonEmpty(command?.id) ? command.id : String(index);
  if (!nonEmpty(command?.id) || !nonEmpty(command?.command)) {
    errors.push(`command ${id} must include id and command`);
  }
  if (!Number.isInteger(command?.exitCode) || !["pass", "fail", "skip"].includes(command?.status)) {
    errors.push(`command ${id} must include an integer exitCode and valid status`);
    return;
  }
  if (!command?.counts || !["passed", "failed", "skipped"].every((key) => Number.isInteger(command.counts[key]) && command.counts[key] >= 0)) {
    errors.push(`command ${id} must include non-negative result counts`);
    return;
  }
  if (command.status === "pass" && (command.exitCode !== 0 || command.counts.failed !== 0 || command.counts.skipped !== 0)) {
    errors.push(`command ${id} reports pass with failed or skipped results`);
  }
  if (command.status !== "pass") errors.push(`command ${id} is not passing`);
}

function validateArtifact(artifact, index, rootDir, errors) {
  const id = nonEmpty(artifact?.id) ? artifact.id : String(index);
  const relativePathValid = nonEmpty(artifact?.relativePath)
    && !isAbsolute(artifact.relativePath)
    && !artifact.relativePath.split(/[\\/]/).includes("..");
  if (!relativePathValid) errors.push(`artifact ${id} must use a relative path without traversal`);
  if (!HASH.test(artifact?.sha256 ?? "")) errors.push(`artifact ${id} must include a valid SHA-256`);

  const retrieval = artifact?.retrieval;
  const localRetrieval = retrieval?.kind === "local" && nonEmpty(retrieval?.locator);
  const urlRetrieval = retrieval?.kind === "url" && /^https:\/\/[^\s]+$/i.test(retrieval?.locator ?? "");
  if (!localRetrieval && !urlRetrieval) errors.push(`artifact ${id} must include a valid retrieval descriptor`);

  const artifactPath = resolve(rootDir, relativePathValid ? artifact.relativePath : "__invalid_artifact__");
  if (!relativePathValid || !isInside(rootDir, artifactPath) || !existsSync(artifactPath)) {
    errors.push(`artifact ${id} is not retrievable from rootDir`);
    return;
  }

  let realArtifact;
  try {
    realArtifact = realpathSync(artifactPath);
    if (!isInside(rootDir, realArtifact)) {
      errors.push(`artifact ${id} resolves outside rootDir`);
      return;
    }
    if (!statSync(realArtifact).isFile()) {
      errors.push(`artifact ${id} must resolve to a regular file`);
      return;
    }
  } catch {
    errors.push(`artifact ${id} is not retrievable from rootDir`);
    return;
  }

  if (HASH.test(artifact.sha256)) {
    try {
      const actual = createHash("sha256").update(readFileSync(realArtifact)).digest("hex");
      if (actual !== artifact.sha256.toLowerCase()) errors.push(`artifact ${id} SHA-256 does not match its file`);
    } catch {
      errors.push(`artifact ${id} could not be read as a regular file`);
    }
  }
}

function readArtifactText(artifact, rootDir) {
  if (!nonEmpty(artifact?.relativePath) || isAbsolute(artifact.relativePath) || artifact.relativePath.split(/[\\/]/).includes("..")) return null;
  try {
    const realArtifact = realpathSync(resolve(rootDir, artifact.relativePath));
    if (!isInside(rootDir, realArtifact) || !statSync(realArtifact).isFile()) return null;
    return readFileSync(realArtifact, "utf8");
  } catch {
    return null;
  }
}

function validateCommandTranscript(command, index, artifactsById, rootDir, errors) {
  const id = nonEmpty(command?.id) ? command.id : String(index);
  if (!nonEmpty(command?.transcriptRef)) return;
  const artifact = artifactsById.get(command.transcriptRef);
  if (!artifact) return;
  const transcript = readArtifactText(artifact, rootDir);
  if (transcript === null) return;
  const match = transcript.match(/\bexit=(\d+)\s+passed=(\d+)\s+failed=(\d+)\s+skipped=(\d+)\b/);
  if (!match) {
    errors.push(`command ${id} transcript must include exit, passed, failed, and skipped counts`);
    return;
  }
  const [, exitCode, passed, failed, skipped] = match.map(Number);
  if (exitCode !== command?.exitCode
    || passed !== command?.counts?.passed
    || failed !== command?.counts?.failed
    || skipped !== command?.counts?.skipped) {
    errors.push(`command ${id} transcript does not match declared result`);
  }
}

function hasTrustedReviewAttestation(review, artifactIds) {
  return nonEmpty(review?.attestationRef)
    && artifactIds.has(review.attestationRef)
    && review?.provider === "github-pull-request-review"
    && GITHUB_PR_REVIEW_URL.test(review?.providerUrl ?? "");
}

function validateRankingObservation(observation, errors, artifactIds, artifactsById, rootDir) {
  if (observation?.type !== "search-ranking") return;
  const hasRealSource = /^https:\/\/[^\s]+$/i.test(observation?.source ?? "")
    && !/synthetic|fixture|fabricated/i.test(observation.source);
  if (!hasRealSource) errors.push("search-ranking observations require a retrievable non-synthetic source");
  if (!nonEmpty(observation?.query) || !validTimestamp(observation?.observedAt) || !Number.isFinite(observation?.position) || observation.position <= 0) {
    errors.push("search-ranking observations require query, exact observation time, and positive position");
  }
  if (!nonEmpty(observation?.snapshotRef) || !artifactIds.has(observation.snapshotRef)) {
    errors.push("search-ranking observations require a trusted snapshot artifact reference");
    return;
  }

  const artifact = artifactsById.get(observation.snapshotRef);
  if (!artifact) return;
  const snapshotText = readArtifactText(artifact, rootDir);
  if (snapshotText === null) {
    errors.push("search-ranking observation snapshot is not readable");
    return;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(snapshotText);
  } catch {
    errors.push("search-ranking observation snapshot must be valid JSON");
    return;
  }

  if (snapshot?.query !== observation.query
    || snapshot?.observedAt !== observation.observedAt
    || snapshot?.position !== observation.position
    || snapshot?.source !== observation.source) {
    errors.push("search-ranking observation snapshot does not match declared result");
  }
}

export function validateQualityEvidence(manifest, options = {}) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return ["manifest must be an object"];
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (manifest.repository !== "alirezasafaeigfx/auditsystems") errors.push("repository must identify alirezasafaeigfx/auditsystems");
  if (!SHA.test(manifest.baseSha ?? "") || !SHA.test(manifest.candidateSha ?? "")) errors.push("baseSha and candidateSha must be full SHA-1 commit IDs");
  if (!validTimestamp(manifest.capturedAt)) errors.push("capturedAt must be an exact ISO UTC timestamp");
  if (manifest.sourceDirty !== false) errors.push("sourceDirty must be false");

  if (!Array.isArray(manifest.taskIds) || manifest.taskIds.length === 0) errors.push("taskIds must be non-empty");
  for (const taskId of manifest.taskIds ?? []) {
    if (!Object.hasOwn(REQUIRED_CRITERIA, taskId)) errors.push(`unknown task ${taskId}`);
  }

  if (!Array.isArray(manifest.commands) || manifest.commands.length === 0) errors.push("commands must be non-empty");
  for (const [index, command] of (manifest.commands ?? []).entries()) validateCommand(command, index, errors);

  if (!Array.isArray(manifest.criteria) || manifest.criteria.length === 0) errors.push("criteria must be non-empty");
  const criterionIds = new Set();
  for (const [index, criterion] of (manifest.criteria ?? []).entries()) {
    const id = nonEmpty(criterion?.id) ? criterion.id : String(index);
    if (!KNOWN_CRITERIA.has(criterion?.id)) errors.push(`unknown criterion ${id}`);
    if (criterionIds.has(criterion?.id)) errors.push(`duplicate criterion ${id}`);
    criterionIds.add(criterion?.id);
    if (criterion?.scopeSha !== manifest.candidateSha) errors.push(`criterion ${id} scopeSha must match candidateSha`);
    if (criterion?.verdict !== "PASS") errors.push(`criterion ${id} must have PASS verdict`);
    if (!Array.isArray(criterion?.evidenceRefs) || criterion.evidenceRefs.length === 0 || criterion.evidenceRefs.some((ref) => !nonEmpty(ref))) {
      errors.push(`criterion ${id} must reference evidence`);
    }
  }
  for (const taskId of manifest.taskIds ?? []) {
    for (const criterionId of REQUIRED_CRITERIA[taskId] ?? []) {
      if (!criterionIds.has(criterionId)) errors.push(`task ${taskId} is missing required criterion ${criterionId}`);
    }
  }

  if (!Array.isArray(manifest.artifacts) || manifest.artifacts.length === 0) errors.push("artifacts must be non-empty");
  const rootDir = realpathSync(resolve(options.rootDir ?? process.cwd()));
  const artifactIds = new Set();
  const artifactsById = new Map();
  for (const [index, artifact] of (manifest.artifacts ?? []).entries()) {
    if (!nonEmpty(artifact?.id) || artifactIds.has(artifact?.id)) errors.push(`artifact ${index} must have a unique id`);
    if (nonEmpty(artifact?.id)) {
      artifactIds.add(artifact.id);
      if (!artifactsById.has(artifact.id)) artifactsById.set(artifact.id, artifact);
    }
    validateArtifact(artifact, index, rootDir, errors);
  }
  for (const criterion of manifest.criteria ?? []) {
    for (const evidenceRef of criterion?.evidenceRefs ?? []) {
      if (!artifactIds.has(evidenceRef)) errors.push(`criterion ${criterion?.id ?? "unknown"} references missing artifact ${evidenceRef}`);
    }
  }
  for (const [index, command] of (manifest.commands ?? []).entries()) {
    const id = nonEmpty(command?.id) ? command.id : String(index);
    if (!nonEmpty(command?.transcriptRef) || !artifactIds.has(command.transcriptRef)) {
      errors.push(`command ${id} must reference a trusted execution transcript artifact`);
      continue;
    }
    validateCommandTranscript(command, index, artifactsById, rootDir, errors);
  }

  if (!Array.isArray(manifest.reviews) || manifest.reviews.length === 0) errors.push("reviews must be non-empty");
  for (const [index, review] of (manifest.reviews ?? []).entries()) {
    if (!nonEmpty(review?.reviewer) || !["human", "independent-agent", "self"].includes(review?.type) || !Array.isArray(review?.findings) || !["accepted", "changes_requested", "pending"].includes(review?.disposition)) {
      errors.push(`review ${index} must identify reviewer, type, findings, and disposition`);
    }
    if (review?.scopeSha !== manifest.candidateSha) errors.push(`review ${index} scopeSha must match candidateSha`);
    if (["human", "independent-agent"].includes(review?.type) && review?.disposition === "accepted" && !hasTrustedReviewAttestation(review, artifactIds)) {
      errors.push(`review ${index} must reference an authenticated review-provider attestation`);
    }
  }
  if (!(manifest.reviews ?? []).some((review) => ["human", "independent-agent"].includes(review?.type)
    && review?.scopeSha === manifest.candidateSha
    && review?.disposition === "accepted"
    && hasTrustedReviewAttestation(review, artifactIds))) {
    errors.push("manifest requires an accepted independent review for candidateSha");
  }
  if ((manifest.reviews ?? []).some((review) => review?.disposition === "changes_requested")) errors.push("manifest cannot pass with changes_requested review");

  if (!Array.isArray(manifest.observations)) errors.push("observations must be a list");
  for (const observation of manifest.observations ?? []) validateRankingObservation(observation, errors, artifactIds, artifactsById, rootDir);
  if (!Array.isArray(manifest.limitations)) errors.push("limitations must be a list");

  if (options.verifyGitIdentity !== false && SHA.test(manifest.baseSha ?? "") && SHA.test(manifest.candidateSha ?? "")) {
    try {
      const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim();
      if (head !== manifest.candidateSha) errors.push("candidateSha must equal the checked-out commit");
      execFileSync("git", ["cat-file", "-e", `${manifest.baseSha}^{commit}`], { cwd: rootDir, stdio: "ignore" });
      execFileSync("git", ["merge-base", "--is-ancestor", manifest.baseSha, manifest.candidateSha], { cwd: rootDir, stdio: "ignore" });
      const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: rootDir, encoding: "utf8" }).trim();
      if (manifest.sourceDirty === false && status) errors.push("checked-out source must be clean when sourceDirty is false");
    } catch {
      errors.push("baseSha and candidateSha must resolve in rootDir with baseSha as an ancestor");
    }
  }

  return errors;
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`missing ${name}`);
  return process.argv[index + 1];
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (invokedPath && import.meta.url === invokedPath) {
  const rootDir = resolve(process.argv.includes("--root") ? readOption("--root") : process.cwd());
  const manifestPath = resolve(rootDir, readOption("--manifest"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const errors = validateQualityEvidence(manifest, { rootDir });
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  process.stdout.write(`Quality evidence manifest PASS: ${manifest.candidateSha}\n`);
}
