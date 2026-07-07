import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPostBySlug, getBlogSlugs, getRelatedBlogPosts } from "../../../content/blog";
import { buildArticleSchema, buildBreadcrumbSchema, buildPageMetadata } from "../../../lib/seoMeta";
import SeoPageEvent from "../../../components/SeoPageEvent";

export async function generateStaticParams() {
  return getBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug, "fa");
  if (!post) {
    return { title: "مقاله پیدا نشد" };
  }

  return buildPageMetadata({
    locale: "fa",
    path: `/blog/${post.slug}`,
    title: `${post.title} | آنالیزور سئو`,
    description: post.description,
    type: "article",
    keywords: ["مقاله سئو", "آموزش سئو", "بررسی سایت", post.slug.replaceAll("-", " ")]
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug, "fa");

  if (!post) {
    notFound();
  }

  const related = getRelatedBlogPosts(post.slug, "fa");
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "خانه", path: "/" },
    { name: "وبلاگ", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` }
  ]);
  const articleSchema = buildArticleSchema({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    inLanguage: "fa-IR",
    datePublished: post.updatedAt,
    dateModified: post.updatedAt
  });

  const contentHtml = post.content
    .split("\n")
    .map((line) => {
      if (line.startsWith("## ")) {
        return `<h2>${line.slice(3)}</h2>`;
      }
      if (line.startsWith("### ")) {
        return `<h3>${line.slice(4)}</h3>`;
      }
      if (line.startsWith("- ")) {
        return `<li>${line.slice(2)}</li>`;
      }
      if (line.trim() === "") {
        return "";
      }
      return `<p>${line}</p>`;
    })
    .join("\n");

  return (
    <main className="grid">
      <SeoPageEvent event="seo_blog_view" params={{ locale: "fa", slug: post.slug }} />
      <section className="card grid">
        <nav aria-label="Breadcrumb">
          <Link href="/blog">بازگشت به وبلاگ</Link>
        </nav>
        <h1>{post.title}</h1>
        <p>{post.description}</p>
        <p className="text-sm text-muted">آخرین بروزرسانی: {post.updatedAt}</p>
      </section>

      <section className="card">
        <h2>فهرست مطالب</h2>
        <ul>
          {post.sections.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>

      <article className="card" dangerouslySetInnerHTML={{ __html: contentHtml }} />

      <section className="card">
        <h2>{post.cta}</h2>
        <p>
          <Link href="/" className="btn">
            شروع بررسی رایگان
          </Link>
        </p>
      </section>

      {related.length > 0 ? (
        <section className="card">
          <h2>مقاله‌های مرتبط</h2>
          <ul>
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/blog/${item.slug}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script
        id="blog-fa-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        id="blog-fa-article-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
    </main>
  );
}
