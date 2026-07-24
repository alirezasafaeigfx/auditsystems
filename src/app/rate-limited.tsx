import Link from "next/link";

export default function RateLimited() {
  return (
    <main style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div style={{ fontSize: "4rem", fontWeight: 800, color: "#d97706" }}>۴۲۹</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>درخواست‌ها بیش از حد مجاز</h1>
      <p style={{ color: "var(--muted)", marginBottom: "2rem", maxWidth: "400px", margin: "0 auto 2rem" }}>
        شما در مدت زمان کوتاه درخواست‌های زیادی ارسال کرده‌اید. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Link href="/" style={{ padding: "0.75rem 1.5rem", background: "var(--brand)", color: "#fff", borderRadius: "0.5rem", textDecoration: "none", fontWeight: 600 }}>
          صفحه اصلی
        </Link>
      </div>
    </main>
  );
}
