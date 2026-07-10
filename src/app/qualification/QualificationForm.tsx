"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function errorMessage(code: string): string {
  const messages: Record<string, string> = {
    DOMAIN_REQUIRED: "آدرس سایت را وارد کنید.",
    VALID_EMAIL_REQUIRED: "ایمیل معتبر وارد کنید.",
    BUSINESS_TYPE_REQUIRED: "نوع کسب‌وکار را مشخص کنید.",
    PRIMARY_CONCERN_TOO_SHORT: "مشکل اصلی را کمی دقیق‌تر بنویسید.",
    CONSENT_REQUIRED: "برای ثبت درخواست باید با بررسی عمومی سایت و سیاست حریم خصوصی موافقت کنید.",
    DOMAIN_NOT_PUBLICLY_REACHABLE: "دامنه باید عمومی و قابل دسترس باشد.",
    RATE_LIMITED: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
  };
  return messages[code] ?? "ثبت درخواست با خطا روبه‌رو شد.";
}

export default function QualificationForm() {
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [source, setSource] = useState({
    leadSource: "direct",
    sourcePlacement: "qualification_page",
    sourceOffer: "request_assessment",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSource({
      leadSource: params.get("source") ?? params.get("utm_source") ?? "direct",
      sourcePlacement: params.get("placement") ?? params.get("utm_content") ?? "qualification_page",
      sourceOffer: params.get("offer") ?? "request_assessment",
    });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });
    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: form.get("domain"),
        contact: form.get("contact"),
        name: form.get("name"),
        phone: form.get("phone"),
        company: form.get("company"),
        businessType: form.get("businessType"),
        primaryConcern: form.get("primaryConcern"),
        consentPrivacy: form.get("consentPrivacy") === "on",
        ...source,
        submitEventId: `lead_submit_${Date.now()}`,
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      setState({ kind: "error", message: errorMessage(String(body.error ?? "")) });
      return;
    }

    setState({ kind: "success" });
  }

  if (state.kind === "success") {
    return (
      <section className="card hero" aria-live="polite">
        <span className="badge">درخواست ثبت شد</span>
        <h1>درخواست ارزیابی دریافت شد</h1>
        <p>درخواست شما برای بررسی qualification ثبت شد و برای پیگیری داخلی در صف قرار گرفت.</p>
        <p>مرحله بعدی بررسی qualification و شروع دستی Audit توسط اپراتور است.</p>
        <div className="hero-actions">
          <Link href="/sample-report" className="button secondary">مشاهده نمونه گزارش</Link>
          <Link href="/" className="button">بازگشت</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid" aria-label="درخواست ارزیابی Audit">
      <label>
        دامنه یا آدرس سایت
        <input name="domain" inputMode="url" placeholder="https://example.com" required />
      </label>
      <label>
        ایمیل کاری
        <input name="contact" type="email" placeholder="name@example.com" required />
      </label>
      <div className="grid-2">
        <label>
          نام
          <input name="name" autoComplete="name" />
        </label>
        <label>
          تلفن یا پیام‌رسان
          <input name="phone" autoComplete="tel" />
        </label>
      </div>
      <div className="grid-2">
        <label>
          شرکت / برند
          <input name="company" autoComplete="organization" />
        </label>
        <label>
          نوع کسب‌وکار
          <select name="businessType" required defaultValue="">
            <option value="" disabled>انتخاب کنید</option>
            <option value="ecommerce">فروشگاه آنلاین</option>
            <option value="agency">آژانس / فریلنسر</option>
            <option value="content">محتوا / رسانه</option>
            <option value="saas">SaaS / محصول نرم‌افزاری</option>
            <option value="corporate">سایت شرکتی</option>
            <option value="other">سایر</option>
          </select>
        </label>
      </div>
      <label>
        مشکل اصلی
        <textarea
          name="primaryConcern"
          rows={5}
          minLength={12}
          placeholder="مثلاً افت ورودی گوگل، کندی موبایل، مشکل ایندکس، ریسک امنیتی، یا نیاز به گزارش برای مشتری"
          required
        />
      </label>
      <label className="checkbox-row">
        <input name="consentPrivacy" type="checkbox" required />
        <span>موافقم سایت به‌صورت عمومی و بدون دسترسی به پنل خصوصی بررسی شود و اطلاعات تماس برای پیگیری همین درخواست ذخیره شود.</span>
      </label>
      {state.kind === "error" ? <p role="alert" className="status-note is-danger">{state.message}</p> : null}
      <button type="submit" disabled={state.kind === "submitting"}>
        {state.kind === "submitting" ? "در حال ثبت..." : "درخواست ارزیابی"}
      </button>
    </form>
  );
}
