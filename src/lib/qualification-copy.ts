export type QualificationLocale = "fa" | "en";

const sharedErrors = {
  fa: {
    DOMAIN_REQUIRED: "آدرس سایت را وارد کنید.", VALID_EMAIL_REQUIRED: "ایمیل معتبر وارد کنید.", BUSINESS_TYPE_REQUIRED: "نوع کسب‌وکار را مشخص کنید.", PRIMARY_CONCERN_TOO_SHORT: "مشکل اصلی را کمی دقیق‌تر بنویسید.", CONSENT_REQUIRED: "برای ثبت درخواست باید با بررسی عمومی سایت و سیاست حریم خصوصی موافقت کنید.", DOMAIN_NOT_PUBLICLY_REACHABLE: "دامنه باید عمومی و قابل دسترس باشد.", RATE_LIMITED: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.", NETWORK_ERROR: "ارتباط با سرور برقرار نشد. اطلاعات شما حفظ شده است؛ دوباره تلاش کنید.", INVALID_RESPONSE: "پاسخ سرور قابل بررسی نبود. اطلاعات شما حفظ شده است؛ دوباره تلاش کنید.", fallback: "ثبت درخواست با خطا روبه‌رو شد.",
  },
  en: {
    DOMAIN_REQUIRED: "Enter your website address.", VALID_EMAIL_REQUIRED: "Enter a valid email address.", BUSINESS_TYPE_REQUIRED: "Select your business type.", PRIMARY_CONCERN_TOO_SHORT: "Describe your main concern in a little more detail.", CONSENT_REQUIRED: "Agree to the public-site review and privacy policy before submitting.", DOMAIN_NOT_PUBLICLY_REACHABLE: "The domain must be public and reachable.", RATE_LIMITED: "Too many requests. Please wait and try again.", NETWORK_ERROR: "We could not reach the server. Your entries are preserved; please try again.", INVALID_RESPONSE: "The server response could not be verified. Your entries are preserved; please try again.", fallback: "The request could not be submitted.",
  },
} as const;

export function qualificationCopy(locale: QualificationLocale) {
  const common = locale === "en" ? {
    formLabel: "Request an Audit assessment", domain: "Website address", email: "Work email", name: "Name", phone: "Phone or messenger", company: "Company / brand", businessType: "Business type", select: "Select", concern: "Main concern", concernPlaceholder: "For example: declining search traffic, slow mobile performance, indexing issues, security risk, or a client report", consent: "I agree that the public website may be reviewed without private-panel access and that my contact details may be stored for this request.", submit: "Request assessment", submitting: "Submitting...", successBadge: "Request received", successTitle: "Assessment request received", successBody: "Your request is queued for internal review and a manual Audit start.", sample: "View sample report", home: "Back to home", homeHref: "/en", sampleHref: "/en/sample-report", options: ["Online store", "Agency / freelancer", "Content / media", "SaaS / software product", "Corporate website", "Other"], errors: sharedErrors.en,
  } : {
    formLabel: "درخواست ارزیابی Audit", domain: "دامنه یا آدرس سایت", email: "ایمیل کاری", name: "نام", phone: "تلفن یا پیام‌رسان", company: "شرکت / برند", businessType: "نوع کسب‌وکار", select: "انتخاب کنید", concern: "مشکل اصلی", concernPlaceholder: "مثلاً افت ورودی گوگل، کندی موبایل، مشکل ایندکس، ریسک امنیتی، یا نیاز به گزارش برای مشتری", consent: "موافقم سایت به‌صورت عمومی و بدون دسترسی به پنل خصوصی بررسی شود و اطلاعات تماس برای پیگیری همین درخواست ذخیره شود.", submit: "درخواست ارزیابی", submitting: "در حال ثبت...", successBadge: "درخواست ثبت شد", successTitle: "درخواست ارزیابی دریافت شد", successBody: "درخواست شما برای بررسی و شروع دستی Audit در صف داخلی قرار گرفت.", sample: "مشاهده نمونه گزارش", home: "بازگشت", homeHref: "/", sampleHref: "/sample-report", options: ["فروشگاه آنلاین", "آژانس / فریلنسر", "محتوا / رسانه", "SaaS / محصول نرم‌افزاری", "سایت شرکتی", "سایر"], errors: sharedErrors.fa,
  };
  return common;
}
