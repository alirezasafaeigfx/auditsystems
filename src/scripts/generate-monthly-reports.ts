import { prisma } from "../lib/db";
import { generateMonthlyReport } from "../lib/monthly-report";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

async function generateMonthlyReports() {
  const args = process.argv.slice(2);
  const monthArg = args.find((a) => a.startsWith("--month="));
  const yearArg = args.find((a) => a.startsWith("--year="));

  const now = new Date();
  const month = monthArg ? parseInt(monthArg.split("=")[1], 10) : now.getMonth() + 1;
  const year = yearArg ? parseInt(yearArg.split("=")[1], 10) : now.getFullYear();

  if (month < 1 || month > 12) {
    console.error("Invalid month. Must be 1-12.");
    process.exit(1);
  }

  console.log(`Generating monthly reports for ${month}/${year}...`);

  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() }
    },
    include: {
      organization: true,
      plan: true
    }
  });

  console.log(`Found ${activeSubscriptions.length} active subscription(s).`);

  const reportDir = join(process.cwd(), "ops", "reports", "monthly", `${year}`, String(month).padStart(2, "0"));
  await mkdir(reportDir, { recursive: true });

  let generated = 0;
  let failed = 0;

  for (const sub of activeSubscriptions) {
    try {
      console.log(`Generating report for ${sub.organization.name}...`);

      const { markdown, pdf, data } = await generateMonthlyReport(sub.organizationId, month, year);

      if (data.totalAudits === 0) {
        console.log(`  Skipped: no audits in this period.`);
        continue;
      }

      const slug = sub.organization.slug;
      const mdPath = join(reportDir, `${slug}.md`);
      const pdfPath = join(reportDir, `${slug}.pdf`);

      await writeFile(mdPath, markdown, "utf-8");
      await writeFile(pdfPath, pdf);

      console.log(`  Generated: ${mdPath}`);
      console.log(`  Generated: ${pdfPath}`);
      generated++;
    } catch (error) {
      console.error(`  Failed for ${sub.organization.name}:`, error);
      failed++;
    }
  }

  console.log(`\nMonthly report generation complete.`);
  console.log(`  Generated: ${generated}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${reportDir}`);

  await prisma.$disconnect();
}

generateMonthlyReports().catch(async (error) => {
  console.error("Monthly report generation failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
