"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchCSRFHeaders } from "../../../../lib/csrf-client";

function inviteErrorMessage(code: string): string {
  if (code === "INVALID_TOKEN") return "لینک دعوت معتبر نیست.";
  if (code === "INVITE_NOT_FOUND") return "دعوت‌نامه پیدا نشد یا قبلاً جایگزین شده است.";
  if (code === "INVITE_NOT_ACTIVE") return "دعوت‌نامه دیگر فعال نیست.";
  if (code === "INVITE_EXPIRED") return "مهلت این دعوت‌نامه به پایان رسیده است.";
  if (code === "INVITE_ALREADY_ACCEPTED") return "این دعوت‌نامه قبلاً استفاده شده است.";
  if (code === "INVITE_EMAIL_MISMATCH") return "این دعوت‌نامه برای ایمیل حساب فعلی صادر نشده است.";
  if (code === "RATE_LIMITED") return "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
  if (code === "FORBIDDEN") return "درخواست امنیتی معتبر نیست. صفحه را تازه‌سازی کنید.";
  return "پذیرش دعوت‌نامه ناموفق بود.";
}

export default function AcceptTeamInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function acceptInvite() {
    if (!token || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const csrfHeaders = await fetchCSRFHeaders();
      const response = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders },
        body: JSON.stringify({ token }),
      });

      if (response.status === 401) {
        const next = encodeURIComponent(`/app/team/accept?token=${token}`);
        router.push(`/login?next=${next}`);
        return;
      }

      const body = await response.json() as { error?: string };
      if (!response.ok || body.error) {
        setError(inviteErrorMessage(body.error ?? ""));
        return;
      }

      setAccepted(true);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: "36rem", margin: "3rem auto", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>پذیرش دعوت تیم</h1>

      {!token ? (
        <div role="alert" style={{ padding: "1rem", borderRadius: "0.5rem", background: "#fee2e2" }}>
          لینک دعوت معتبر نیست.
        </div>
      ) : accepted ? (
        <div style={{ padding: "1rem", borderRadius: "0.5rem", background: "#dcfce7" }}>
          عضویت شما با موفقیت ثبت شد.
          <div style={{ marginTop: "1rem" }}>
            <button className="button" onClick={() => router.push("/app/team")}>مشاهده تیم</button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ marginBottom: "1rem", color: "var(--muted, #6b7280)" }}>
            برای اضافه‌شدن به سازمان، دعوت‌نامه را با حسابی بپذیرید که ایمیل آن با ایمیل دعوت‌شده یکسان است.
          </p>
          {error && (
            <div role="alert" style={{ padding: "0.75rem 1rem", marginBottom: "1rem", borderRadius: "0.5rem", background: "#fee2e2" }}>
              {error}
            </div>
          )}
          <button className="button" disabled={submitting} onClick={acceptInvite}>
            {submitting ? "در حال ثبت..." : "پذیرش دعوت‌نامه"}
          </button>
        </>
      )}
    </div>
  );
}
