import { prisma } from "../lib/db";

async function expireSubscriptions() {
  console.log("Checking for expired subscriptions...");

  const now = new Date();

  const expired = await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lt: now }
    },
    data: {
      status: "PAST_DUE"
    }
  });

  console.log(`Expired ${expired.count} subscription(s).`);

  const pastDue = await prisma.subscription.updateMany({
    where: {
      status: "PAST_DUE",
      currentPeriodEnd: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
    },
    data: {
      status: "CANCELED"
    }
  });

  console.log(`Canceled ${pastDue.count} past-due subscription(s) (over 30 days).`);

  await prisma.$disconnect();
  console.log("Subscription expiry complete.");
}

expireSubscriptions().catch(async (error) => {
  console.error("Subscription expiry failed:", error);
  await prisma.$disconnect();
  process.exit(1);
});
