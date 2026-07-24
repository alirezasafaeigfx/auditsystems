import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { logEvent } from "../../../lib/observability";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, locale } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedLocale = locale?.toString().toLowerCase().startsWith("en") ? "en" : "fa";

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      if (existing.unsubscribedAt) {
        await prisma.newsletterSubscriber.update({
          where: { email: normalizedEmail },
          data: { unsubscribedAt: null, locale: normalizedLocale }
        });
        logEvent("info", "newsletter_resubscribed", { email: normalizedEmail, locale: normalizedLocale });
      }
      return NextResponse.json({ ok: true, message: "Already subscribed" });
    }

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        locale: normalizedLocale
      }
    });

    logEvent("info", "newsletter_signup", { email: normalizedEmail, locale: normalizedLocale });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
