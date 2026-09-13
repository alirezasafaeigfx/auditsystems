import type { Metadata } from "next";
import Link from "next/link";
import { getBlogPosts } from "../../../../content/blog";
import { buildPageMetadata } from "../../../../lib/seoMeta";
import { renderBlogContent } from "../../../../lib/blog-content";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPosts("en").find((entry) => entry.slug === slug);

  if (!post) {
    return { title: "Post not found", robots: { index: false, follow: false } };
  }

  return buildPageMetadata({
    locale: "en",
    path: `/blog/${post.slug}`,
    title: post.title,
    description: post.description,
    type: "article",
    keywords: ["technical audit", "technical SEO", post.slug.replaceAll("-", " ")]
  });
}

export default async function EnglishBlogSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = getBlogPosts("en");
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <main className="container page-shell">
        <section className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <h1>Post not found</h1>
          <Link href="/en/blog" style={{ color: "var(--brand, #2563eb)" }}>Back to blog</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container page-shell">
      <article>
        <Link href="/en/blog" style={{ fontSize: "0.875rem", color: "var(--muted, #6b7280)" }}>← Back to blog</Link>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "1rem", marginBottom: "0.5rem" }}>{post.title}</h1>
        <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem", marginBottom: "2rem" }}>Updated: {post.updatedAt}</p>
        {post.sources.length > 0 ? (
          <p style={{ color: "var(--muted, #6b7280)", fontSize: "0.875rem" }}>
            Sources: {post.sources.map((source, index) => (
              <span key={source.url}>{index > 0 ? ", " : ""}<a href={source.url} rel="noreferrer">{source.label}</a></span>
            ))}
          </p>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: renderBlogContent(post.content) }} />
        <div style={{ marginTop: "2rem", padding: "1.5rem", background: "var(--brand-bg, #f0fdf4)", borderRadius: "0.5rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{post.cta}</p>
          <Link href="/en/audit" className="button">Start Website Audit</Link>
        </div>
      </article>
    </main>
  );
}
