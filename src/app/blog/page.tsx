import Link from "next/link";
import { getBlogPosts } from "../../content/blog";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seoMeta";

const posts = getBlogPosts("fa");

export const metadata: Metadata = buildPageMetadata({
  locale: "fa",
  path: "/blog",
  title: "وبلاگ سئو و بهینه‌سازی سایت",
  description: "مقاله‌های تخصصی درباره سئو، بهینه‌سازی سرعت، امنیت وب و بهبود نرخ تبدیل فروشگاه‌های اینترنتی.",
  keywords: ["وبلاگ سئو", "مقاله بهینه‌سازی سایت", "آموزش سئو فنی", "امنیت وب"]
});

export default function BlogIndexPage() {
  return (
    <main>
      <section className="card hero">
        <h1>وبلاگ سئو و بهینه‌سازی سایت</h1>
        <p>مقاله‌های تخصصی برای کمک به بهبود رتبه سایت، سرعت بارگذاری و امنیت فروشگاه اینترنتی شما.</p>
      </section>

      <section className="guide-grid">
        {posts.map((post) => (
          <article key={post.slug} className="guide-item">
            <h2>{post.title}</h2>
            <p>{post.description}</p>
            <p className="text-sm text-muted">آخرین بروزرسانی: {post.updatedAt}</p>
            <p>
              <Link href={`/blog/${post.slug}`}>مطالعه مقاله</Link>
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
