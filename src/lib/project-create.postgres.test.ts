import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { createProjectAtomically, ProjectCreateError } from "./project-create";

const integrationEnabled = process.env.PROJECT_CREATE_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;
const createdOrganizationIds = new Set<string>();

describePostgres("atomic project creation — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    const organizationIds = [...createdOrganizationIds];
    if (organizationIds.length === 0) {
      return;
    }

    await prisma.project.deleteMany({ where: { organizationId: { in: organizationIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
    createdOrganizationIds.clear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("enforces a paid-plan project quota across concurrent creates", async () => {
    const suffix = crypto.randomUUID();
    const organization = await prisma.organization.create({
      data: {
        name: `Atomic Project Test ${suffix}`,
        slug: `atomic-project-test-${suffix}`,
      },
    });
    createdOrganizationIds.add(organization.id);

    expect(await prisma.project.count({ where: { organizationId: organization.id } })).toBe(0);

    const input = (name: string, domain: string) => ({
      organizationId: organization.id,
      name,
      domain,
      normalizedUrl: `https://${domain}/`,
      projectLimit: 1,
    });

    const results = await Promise.allSettled([
      createProjectAtomically(input("First Atomic Project", `first-${suffix}.example.com`)),
      createProjectAtomically(input("Second Atomic Project", `second-${suffix}.example.com`)),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(ProjectCreateError);
    expect(rejected?.reason).toMatchObject({ code: "PROJECT_LIMIT_REACHED" });
    expect(await prisma.project.count({ where: { organizationId: organization.id } })).toBe(1);
  });
});
