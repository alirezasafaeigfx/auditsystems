import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { validateSession } from "../../lib/auth";

export const metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false }
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await validateSession();
  if (!user) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ borderBottom: "1px solid #e5e7eb", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/app" style={{ fontWeight: 700, fontSize: "1.125rem", textDecoration: "none", color: "#111827" }}>
          Audit Systems
        </Link>
        <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/app/projects" style={{ textDecoration: "none", color: "#374151" }}>Projects</Link>
          <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>{user.email}</span>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" style={{ background: "none", border: "1px solid #d1d5db", borderRadius: "0.375rem", padding: "0.25rem 0.75rem", cursor: "pointer", fontSize: "0.875rem" }}>
              Logout
            </button>
          </form>
        </nav>
      </header>
      <main style={{ flex: 1, padding: "2rem 1.5rem", maxWidth: "64rem", margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
