import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div style={{ fontSize: "4rem", fontWeight: 800, color: "#dc2626" }}>۴۰۴</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>صفحه پیدا نشد</h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem", maxWidth: "400px", margin: "0 auto 2rem" }}>
        صفحه‌ای که دنبال آن هستید وجود ندارد یا منتقل شده است.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <Link href="/" style={{ padding: "0.75rem 1.5rem", background: "#0f7a66", color: "#fff", borderRadius: "0.5rem", textDecoration: "none", fontWeight: 600 }}>
          صفحه اصلی
        </Link>
        <Link href="/audit" style={{ padding: "0.75rem 1.5rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem", textDecoration: "none", fontWeight: 600 }}>
          شروع ممیزی
        </Link>
      </div>
    </main>
  );
}
