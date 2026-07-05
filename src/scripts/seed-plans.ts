import { prisma } from "../lib/db";

const PLANS_TO_SEED = [
  {
    code: "free",
    name: "Free",
    priceMonthlyToman: 0,
    projectLimit: 1,
    monthlyAuditLimit: 3,
    pdfExport: false,
    scheduledAudits: false
  },
  {
    code: "starter",
    name: "Starter",
    priceMonthlyToman: 290000,
    projectLimit: 3,
    monthlyAuditLimit: 20,
    pdfExport: true,
    scheduledAudits: false
  },
  {
    code: "pro",
    name: "Pro",
    priceMonthlyToman: 990000,
    projectLimit: 10,
    monthlyAuditLimit: 100,
    pdfExport: true,
    scheduledAudits: true
  },
  {
    code: "agency",
    name: "Agency",
    priceMonthlyToman: 2990000,
    projectLimit: 50,
    monthlyAuditLimit: 500,
    pdfExport: true,
    scheduledAudits: true
  }
];

async function seedPlans() {
  console.log("Seeding plans...");

  for (const plan of PLANS_TO_SEED) {
    const existing = await prisma.plan.findUnique({ where: { code: plan.code } });

    if (existing) {
      await prisma.plan.update({
        where: { code: plan.code },
        data: {
          name: plan.name,
          priceMonthlyToman: plan.priceMonthlyToman,
          projectLimit: plan.projectLimit,
          monthlyAuditLimit: plan.monthlyAuditLimit,
          pdfExport: plan.pdfExport,
          scheduledAudits: plan.scheduledAudits,
          isActive: true
        }
      });
      console.log(`  Updated plan: ${plan.code}`);
    } else {
      await prisma.plan.create({ data: plan });
      console.log(`  Created plan: ${plan.code}`);
    }
  }

  console.log("Plans seeded successfully.");
}

seedPlans()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Plan seeding failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
