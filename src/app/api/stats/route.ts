import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export async function GET() {
  try {
    const [auditCount, successCount] = await Promise.all([
      prisma.auditRun.count(),
      prisma.auditRun.count({ where: { status: "SUCCEEDED" } }),
    ]);

    return NextResponse.json({
      totalAudits: auditCount,
      successfulAudits: successCount,
    });
  } catch {
    return NextResponse.json({ totalAudits: 0, successfulAudits: 0 });
  }
}
