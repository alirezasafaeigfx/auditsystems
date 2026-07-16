import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "../../../content/blog";
import { buildPageMetadata } from "../../../lib/seoMeta";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/blog",
  title: "Technical Audit Blog",
  description: "Practical guides for technical SEO, website security, performance, and evidence-based audits.",
  keywords: ["technical SEO audit", "website security audit", "web performance", "audit best practices"]
});

export default function EnglishBlogPage() {
  const posts = getBlogPosts("en");

  return (
    <main className="container page-shell">
      <section className="section-head">
        <h1>ASDEV Audit Blog</h1>
        <p>Technical guides, SEO tips, and audit best practices.</p>
      </section>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {posts.map((post) => (
          <article key={post.slug} className="card" style={{ padding: "1.5rem" }}>
            <Link href={`/en/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>{post.title}</h2>
              <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                {post.description}
              </p>
              <div style={{ fontSize: "0.75rem", color: "var(--muted, #9ca3af)" }}>
                Updated: {post.updatedAt}
              </div>
            </Link>
          </article>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p>No blog posts available in English yet.</p>
          <Link href="/blog" style={{ color: "var(--brand, #0f7a66)" }}>View in Persian</Link>
        </div>
      )}
    </main>
  );
}
