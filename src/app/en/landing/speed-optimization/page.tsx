import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../../lib/seoMeta";
import HeroAuditForm from "../../../../components/HeroAuditForm";

export const metadata: Metadata = buildPageMetadata({
  locale: "en",
  path: "/en/landing/speed-optimization",
  title: "Website Speed Optimization - Free Performance Check",
  description: "Free website speed audit covering Core Web Vitals, load times, and performance optimization.",
  keywords: ["speed optimization", "performance check", "core web vitals", "website speed"],
});

const speedFactors = [
  { icon: "⚡", title: "Initial Load Time", description: "Time to first byte from server (TTFB)" },
  { icon: "🖼️", title: "Image Optimization", description: "Size, format, and lazy loading of images" },
  { icon: "📜", title: "Scripts", description: "Blocking and non-blocking JS and CSS" },
  { icon: "🗄️", title: "Caching", description: "Browser and server cache settings" },
  { icon: "🌐", title: "CDN", description: "Content Delivery Network usage" },
  { icon: "📊", title: "Core Web Vitals", description: "LCP, CLS and INP - Google metrics" },
];

export default function SpeedOptimizationLandingEn() {
  return (
    <main className="landing">
      <section className="card hero hero-large">
        <span className="badge hero-badge">Free Speed Audit</span>
        <h1>How fast is your website?</h1>
        <p className="hero-lead">
          Discover what slows down your website with a free speed audit and improve user experience.
        </p>
        <HeroAuditForm />
        <ul className="hero-checklist">
          <li>Core Web Vitals check</li>
          <li>Load speed analysis</li>
          <li>Optimization suggestions</li>
        </ul>
      </section>

      <section className="section-head">
        <h2>What factors are checked?</h2>
      </section>

      <section className="feature-grid">
        {speedFactors.map((factor) => (
          <article key={factor.title} className="card feature">
            <span style={{ fontSize: "2rem" }}>{factor.icon}</span>
            <h3>{factor.title}</h3>
            <p>{factor.description}</p>
          </article>
        ))}
      </section>

      <section className="card" style={{ textAlign: "center", padding: "2rem", marginTop: "2rem" }}>
        <h2>Check your website speed now</h2>
        <p style={{ marginBottom: "1rem" }}>The audit is free and results are instant.</p>
        <Link href="/en/audit" className="button">
          Start Speed Audit
        </Link>
      </section>
    </main>
  );
}
