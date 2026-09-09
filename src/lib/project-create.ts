import { Prisma, Project } from "@prisma/client";
import { prisma } from "./db";

export type AtomicProjectCreateInput = {
  organizationId: string;
  name: string;
  domain: string;
  normalizedUrl: string;
  projectLimit: number;
};

export type ProjectCreateErrorCode =
  | "INVALID_PROJECT_LIMIT"
  | "PROJECT_LIMIT_REACHED"
  | "PROJECT_CREATE_RETRY_EXHAUSTED";

export class ProjectCreateError extends Error {
  readonly code: ProjectCreateErrorCode;
  readonly current?: number;
  readonly limit?: number;

  constructor(
    code: ProjectCreateErrorCode,
    details: { current?: number; limit?: number } = {},
  ) {
    super(code);
    this.name = "ProjectCreateError";
    this.code = code;
    this.current = details.current;
    this.limit = details.limit;
  }
}

const MAX_TRANSACTION_ATTEMPTS = 3;

function validateProjectLimit(projectLimit: number): void {
  if (!Number.isFinite(projectLimit) || !Number.isInteger(projectLimit) || projectLimit <= 0) {
    throw new ProjectCreateError("INVALID_PROJECT_LIMIT");
  }
}

function isRetryableTransactionError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function createInTransaction(
  tx: Prisma.TransactionClient,
  input: AtomicProjectCreateInput,
): Promise<Project> {
  const current = await tx.project.count({
    where: { organizationId: input.organizationId },
  });

  if (current >= input.projectLimit) {
    throw new ProjectCreateError("PROJECT_LIMIT_REACHED", {
      current,
      limit: input.projectLimit,
    });
  }

  return tx.project.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      domain: input.domain,
      normalizedUrl: input.normalizedUrl,
    },
  });
}

export async function createProjectAtomically(
  input: AtomicProjectCreateInput,
): Promise<Project> {
  validateProjectLimit(input.projectLimit);

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        (tx) => createInTransaction(tx, input),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }
      if (isRetryableTransactionError(error)) {
        throw new ProjectCreateError("PROJECT_CREATE_RETRY_EXHAUSTED");
      }
      throw error;
    }
  }

  throw new ProjectCreateError("PROJECT_CREATE_RETRY_EXHAUSTED");
}
