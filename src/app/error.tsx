"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div style={{ fontSize: "4rem", fontWeight: 800, color: "#dc2626" }}>۵۰۰</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>خطای سرور</h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem", maxWidth: "400px", margin: "0 auto 2rem" }}>
        مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.
      </p>
      <button
        onClick={() => reset()}
        style={{ padding: "0.75rem 1.5rem", background: "#2563eb", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 600 }}
      >
        تلاش مجدد
      </button>
    </main>
  );
}
