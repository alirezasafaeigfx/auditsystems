import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seoMeta'

export const metadata: Metadata = buildPageMetadata({
  locale: 'en',
  path: '/en/faq',
  title: 'FAQ - Frequently Asked Questions',
  description: 'Answers to common questions about website checking, common issues and solutions',
})

const faqs = [
  {
    q: 'What does this site do?',
    a: 'We check your website and find issues that cause slow loading, low Google rankings, or security problems. Then we tell you how to fix them.',
  },
  {
    q: "I don't know anything about programming. Can I use it?",
    a: "Yes! Our reports are written in simple language. If you have a developer, you can give them the report. If you don't, we'll guide you on who can help.",
  },
  {
    q: 'What is SEO?',
    a: 'SEO means making your website show up when someone searches on Google. For example, if you have a shoe store, when someone types "buy shoes," your site appears at the top of Google results.',
  },
  {
    q: 'Why is my website slow?',
    a: 'There are many reasons: oversized images, unnecessary code, weak server, or other issues. We check all of these and tell you exactly which one is your problem.',
  },
  {
    q: 'How long does it take to get a report?',
    a: 'Usually just a few minutes. After you enter your website address, our system starts checking and sends you the report.',
  },
  {
    q: 'What does your report show?',
    a: 'We divide website issues into three categories: critical (must fix now), high (should fix soon), and medium (can fix later). For each issue, we provide step-by-step solutions.',
  },
  {
    q: 'Is it secure?',
    a: 'Yes. We only look at your website from the outside, like a regular visitor. We have no access to your private information or admin panel.',
  },
  {
    q: 'How can I contact you if I have questions?',
    a: "You can reach us via Telegram or email. The links are at the bottom of the page.",
  },
]

export default function FAQPageEn() {
  return (
    <main className="container page-shell">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/en" className="link">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold" style={{ marginBottom: '0.5rem' }}>Frequently Asked Questions</h1>
      <p className="text-muted" style={{ marginBottom: '3rem' }}>
        Answers to questions we are commonly asked
      </p>

      <div style={{ display: 'grid', gap: '2rem' }}>
        {faqs.map((faq, index) => (
          <div key={index} className="card" style={{ padding: '1.5rem' }}>
            <h2 className="font-bold" style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>{faq.q}</h2>
            <p className="text-muted" style={{ lineHeight: 1.8 }}>{faq.a}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '3rem', padding: '1.5rem', background: 'color-mix(in srgb, var(--brand) 8%, var(--surface))' }}>
        <h3 className="font-bold" style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Have another question?</h3>
        <p style={{ marginBottom: '1rem' }}>
          If you could not find the answer to your question, you can contact us.
        </p>
        <Link
          href="https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=faq&utm_campaign=contact"
          className="button"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact Us
        </Link>
      </div>
    </main>
  )
}
