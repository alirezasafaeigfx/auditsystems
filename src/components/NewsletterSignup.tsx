"use client";

import { FormEvent, useState } from "react";

type NewsletterSignupProps = {
  locale: "fa" | "en";
};

export default function NewsletterSignup({ locale }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const isFa = locale === "fa";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="newsletter-success">
        <p>{isFa ? "با موفقیت ثبت شد! 🎉" : "Successfully subscribed! 🎉"}</p>
      </div>
    );
  }

  return (
    <div className="newsletter-signup">
      <h3>{isFa ? "خبرنامه سئو و امنیت" : "SEO & Security Newsletter"}</h3>
      <p className="newsletter-description">
        {isFa
          ? "نکات عملی سئو، امنیت و بهینه‌سازی سایت را هر هفته دریافت کنید."
          : "Get practical tips on SEO, security, and website optimization every week."}
      </p>
      <form onSubmit={handleSubmit} className="newsletter-form">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isFa ? "ایمیل خود را وارد کنید" : "Enter your email"}
          required
          className="newsletter-input"
          aria-label={isFa ? "ایمیل" : "Email"}
        />
        <button type="submit" disabled={status === "loading"} className="newsletter-button">
          {status === "loading"
            ? isFa ? "در حال ارسال..." : "Sending..."
            : isFa ? "ثبت‌نام" : "Subscribe"}
        </button>
      </form>
      {status === "error" && (
        <p className="newsletter-error">
          {isFa ? "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید." : "Subscription error. Please try again."}
        </p>
      )}
      <p className="newsletter-disclaimer">
        {isFa
          ? "بدون اسپم. فقط محتوای مفید. هر زمان بخواهید لغو کنید."
          : "No spam. Only useful content. Unsubscribe anytime."}
      </p>
    </div>
  );
}
