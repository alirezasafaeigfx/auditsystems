export interface QualityEvidenceValidationOptions {
  rootDir?: string;
  verifyGitIdentity?: boolean;
}

export function validateQualityEvidence(
  manifest: unknown,
  options?: QualityEvidenceValidationOptions,
): string[];
