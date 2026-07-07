import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCaseStudyBySlug, getCaseStudySlugs } from "../../../content/case-studies";
import { buildBreadcrumbSchema, buildPageMetadata } from "../../../lib/seoMeta";
import SeoPageEvent from "../../../components/SeoPageEvent";

export async function generateStaticParams() {
  return getCaseStudySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug, "fa");
  if (!study) {
    return { title: "نمونه کار پیدا نشد" };
  }

  return buildPageMetadata({
    locale: "fa",
    path: `/case-studies/${study.slug}`,
    title: `${study.title} | نمونه کار ASDEV`,
    description: study.problem,
    type: "article",
    keywords: ["نمونه کار سئو", "گزارش موفقیت", study.slug.replaceAll("-", " ")]
  });
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug, "fa");

  if (!study) {
    notFound();
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "خانه", path: "/" },
    { name: "نمونه کارها", path: "/case-studies" },
    { name: study.title, path: `/case-studies/${study.slug}` }
  ]);

  const scoreImprovement = study.scoreAfter - study.scoreBefore;

  return (
    <main className="grid">
      <SeoPageEvent event="seo_case_study_view" params={{ locale: "fa", slug: study.slug }} />
      <section className="card grid">
        <nav aria-label="Breadcrumb">
          <Link href="/case-studies">بازگشت به نمونه کارها</Link>
        </nav>
        <h1>{study.title}</h1>
        <p><strong>مشتری:</strong> {study.client}</p>
        <p className="text-sm text-muted">آخرین بروزرسانی: {study.updatedAt}</p>
      </section>

      <section className="card">
        <h2>امتیاز عملکرد</h2>
        <div className="score-comparison">
          <div className="score-before">
            <span className="score-label">قبل</span>
            <span className="score-value">{study.scoreBefore}</span>
          </div>
          <div className="score-arrow">→</div>
          <div className="score-after">
            <span className="score-label">بعد</span>
            <span className="score-value">{study.scoreAfter}</span>
          </div>
          <div className="score-improvement">
            <span>+{scoreImprovement} امتیاز بهبود</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>چالش</h2>
        <p>{study.problem}</p>
      </section>

      <section className="card">
        <h2>یافته‌ها</h2>
        <ul>
          {study.findings.map((finding, index) => (
            <li key={index}>{finding}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>توصیه‌ها</h2>
        <ul>
          {study.recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>نتیجه</h2>
        <p>{study.result}</p>
      </section>

      <section className="card">
        <h2>{study.cta}</h2>
        <p>
          <Link href="/" className="btn">
            شروع بررسی رایگان
          </Link>
        </p>
      </section>

      <script
        id="case-study-fa-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  );
}
