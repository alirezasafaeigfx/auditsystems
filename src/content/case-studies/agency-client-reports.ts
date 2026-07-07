import type { CaseStudySeed } from "./index";

const agencyClientReports: CaseStudySeed = {
  slug: "agency-client-reports",
  updatedAt: "2026-07-05",
  fa: {
    title: "گزارش‌دهی بهتر برای آژانس دیجیتال",
    client: "آژانس دیجیتال مارکتینگ وب‌پیشرو",
    problem: "آژانس دیجیتال مارکتینگ برای هر مشتری چک‌های سئوی دستی انجام می‌داد که بیش از 4 ساعت زمان می‌برد. این فرآیند زمان‌بر باعث شده بود تعداد مشتریان محدود باشد و هزینه‌های عملیاتی بالا برود.",
    findings: [
      "فرآیند دستی سئو 4+ ساعت برای هر مشتری زمان می‌برد",
      "خطاهای انسانی در بررسی‌های تکراری",
      "عدم وجود استاندارد یکسان در گزارش‌ها",
      "گزارش‌های غیرقابل مقایسه بین مشتریان",
      "هزینه بالای نیروی انسانی برای بررسی‌های تکراری"
    ],
    recommendations: [
      "استفاده از ASDEV Audit برای اتوماسیون بررسی‌ها",
      "ایجاد قالب یکسان گزارش برای تمام مشتریان",
      "برنامه‌ریزی بررسی‌های دوره‌ای خودکار",
      "ارائه داشبورد اختصاصی به هر مشتری",
      "آموزش تیم برای استفاده از ابزارهای خودکار"
    ],
    result: "با اتوماسیون بررسی‌ها، زمان تولید گزارش از 4+ ساعت به 5 دقیقه کاهش یافت. آژانس توانست 3 برابر مشتری بیشتری را مدیریت کند و هزینه‌های عملیاتی 80% کاهش یافت.",
    scoreBefore: 42,
    scoreAfter: 91,
    cta: "آژانس خود را با ASDEV Audit تقویت کنید"
  },
  en: {
    title: "Better Reporting for Digital Agency",
    client: "WebPishro Digital Marketing Agency",
    problem: "The digital marketing agency was performing manual SEO checks for each client, taking 4+ hours per client. This time-consuming process limited the number of clients and increased operational costs.",
    findings: [
      "Manual SEO process takes 4+ hours per client",
      "Human errors in repetitive checks",
      "No standardized reporting format",
      "Reports not comparable between clients",
      "High labor costs for repetitive checks"
    ],
    recommendations: [
      "Use ASDEV Audit for automated checks",
      "Create standardized report templates for all clients",
      "Schedule automated periodic checks",
      "Provide dedicated dashboard for each client",
      "Train team on using automation tools"
    ],
    result: "With automated checks, report generation time reduced from 4+ hours to 5 minutes. The agency could manage 3x more clients and operational costs decreased by 80%.",
    scoreBefore: 42,
    scoreAfter: 91,
    cta: "Strengthen your agency with ASDEV Audit"
  }
};

export default agencyClientReports;
