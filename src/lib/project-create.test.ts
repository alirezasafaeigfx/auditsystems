import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project-1",
    organizationId: "org-1",
    name: "Example",
    domain: "example.com",
    normalizedUrl: "https://example.com/",
    createdAt: new Date("2026-09-09T00:00:00Z"),
    updatedAt: new Date("2026-09-09T00:00:00Z"),
    ...overrides,
  };
}

function createTx() {
  return {
    project: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(project()),
    },
  };
}

type Tx = ReturnType<typeof createTx>;
type TransactionCallback = (client: Tx) => unknown;

const input = {
  organizationId: "org-1",
  name: "Example",
  domain: "example.com",
  normalizedUrl: "https://example.com/",
  projectLimit: 3,
};

describe("project-create", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    "rejects invalid project limit %p before starting a transaction",
    async (projectLimit) => {
      const { createProjectAtomically } = await import("./project-create");

      await expect(createProjectAtomically({ ...input, projectLimit })).rejects.toMatchObject({
        code: "INVALID_PROJECT_LIMIT",
      });

      expect(mocks.transaction).not.toHaveBeenCalled();
    },
  );

  it("counts and creates the project in a Serializable transaction", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementation(async (callback: TransactionCallback, options?: unknown) => {
      expect(options).toEqual({ isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return callback(tx);
    });
    const { createProjectAtomically } = await import("./project-create");

    const result = await createProjectAtomically(input);

    expect(result).toEqual(project());
    expect(tx.project.count).toHaveBeenCalledWith({ where: { organizationId: "org-1" } });
    expect(tx.project.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org-1",
        name: "Example",
        domain: "example.com",
        normalizedUrl: "https://example.com/",
      },
    });
  });

  it("rejects quota exhaustion with the observed current and limit without creating a project", async () => {
    const tx = createTx();
    tx.project.count.mockResolvedValue(3);
    mocks.transaction.mockImplementation(async (callback: TransactionCallback) => callback(tx));
    const { createProjectAtomically } = await import("./project-create");

    await expect(createProjectAtomically(input)).rejects.toMatchObject({
      code: "PROJECT_LIMIT_REACHED",
      current: 3,
      limit: 3,
    });

    expect(tx.project.create).not.toHaveBeenCalled();
  });

  it("retries a P2034 transaction conflict until the third total attempt succeeds", async () => {
    const tx = createTx();
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization", {
      code: "P2034",
      clientVersion: "test",
    });
    mocks.transaction
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (callback: TransactionCallback) => callback(tx));
    const { createProjectAtomically } = await import("./project-create");

    const result = await createProjectAtomically(input);

    expect(result).toEqual(project());
    expect(mocks.transaction).toHaveBeenCalledTimes(3);
    expect(tx.project.create).toHaveBeenCalledTimes(1);
  });

  it("converts a third P2034 transaction conflict into retry exhaustion", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization", {
      code: "P2034",
      clientVersion: "test",
    });
    mocks.transaction.mockRejectedValue(conflict);
    const { createProjectAtomically } = await import("./project-create");

    await expect(createProjectAtomically(input)).rejects.toMatchObject({
      code: "PROJECT_CREATE_RETRY_EXHAUSTED",
    });

    expect(mocks.transaction).toHaveBeenCalledTimes(3);
  });

  it("re-throws unrelated errors unchanged", async () => {
    const error = new Error("database unavailable");
    mocks.transaction.mockRejectedValue(error);
    const { createProjectAtomically } = await import("./project-create");

    await expect(createProjectAtomically(input)).rejects.toBe(error);

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
});
