import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { validateAdminSession } from "../../../../lib/admin-auth";

export async function GET() {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [leads, statusCounts, sourceCounts] = await Promise.all([
    prisma.auditLead.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        run: {
          select: {
            id: true,
            status: true,
            reportStatus: true,
            errorCode: true,
            errorMessage: true,
            createdAt: true,
            finishedAt: true,
          },
        },
      },
    }),
    prisma.auditLead.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.auditLead.groupBy({
      by: ["leadSource"],
      _count: { leadSource: true },
    }),
  ]);

  return NextResponse.json({ leads, statusCounts, sourceCounts });
}
