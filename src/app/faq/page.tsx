import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seoMeta'

export const metadata: Metadata = buildPageMetadata({
  locale: 'fa',
  path: '/faq',
  title: 'سوالات متداول - پاسخ به سوالات رایج',
  description: 'پاسخ به سوالات رایج درباره چک کردن سایت، مشکلات رایج و راه حل‌ها',
})

const faqs = [
  {
    q: 'این سایت چه کاری انجام می‌دهد؟',
    a: 'ما سایت شما را بررسی می‌کنیم و مشکلاتی که باعث کند شدن، پایین آمدن در گوگل یا مشکلات امنیتی می‌شود را پیدا می‌کنیم. بعد به شما می‌گوییم چطور این مشکلات را حل کنید.',
  },
  {
    q: 'من چیزی از برنامه‌نویسی نمی‌دانم، می‌توانم استفاده کنم؟',
    a: 'بله! گزارش ما به زبان ساده نوشته شده. اگر برنامه‌نویس دارید، می‌توانید گزارش را به او بدهید. اگر ندارید، ما راهنمایی می‌کنیم که چه کسی می‌تواند کمک کند.',
  },
  {
    q: 'سئو چیست؟',
    a: 'سئو یعنی کاری کنیم که وقتی کسی در گوگل چیزی جستجو می‌کند، سایت شما را ببیند. مثلاً اگر فروشگاه کفش دارید، وقتی کسی "خرید کفش" می‌نویسد، سایت شما بالای نتایج گوگل باشد.',
  },
  {
    q: 'چرا سایت من کند است؟',
    a: 'دلایل زیادی دارد: عکس‌های خیلی بزرگ، کدهای اضافی، سرور ضعیف یا مشکلات دیگر. ما همه این‌ها را چک می‌کنیم و دقیقاً می‌گوییم کدام یکی مشکل شماست.',
  },
  {
    q: 'چقدر طول می‌کشد تا گزارش آماده شود؟',
    a: 'معمولاً چند دقیقه. بعد از اینکه آدرس سایت را وارد کنید، سیستم ما شروع به بررسی می‌کند و گزارش را برای شما می‌فرستد.',
  },
  {
    q: 'گزارش شما چه چیزهایی را نشان می‌دهد؟',
    a: 'مشکلات سایت را به سه دسته تقسیم می‌کنیم: فوری (باید الان حل شود)، مهم (باید زود حل شود) و معمولی (می‌توان بعداً حل کرد). برای هر مشکل، راه حل گام به گام می‌دهیم.',
  },
  {
    q: 'آیا امن است؟',
    a: 'بله. ما فقط سایت شما را از بیرون نگاه می‌کنیم، مثل یک بازدیدکننده عادی. به اطلاعات خصوصی یا پنل مدیریت شما دسترسی نداریم.',
  },
  {
    q: 'اگر سوالی داشتم چطور بپرسم؟',
    a: 'می‌توانید از طریق تلگرام یا ایمیل با ما تماس بگیرید. لینک‌ها در پایین صفحه هست.',
  },
]

export default function FAQPage() {
  return (
    <main className="container page-shell">
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" className="link">
          ← بازگشت به صفحه اصلی
        </Link>
      </div>

      <h1 className="text-2xl font-bold" style={{ marginBottom: '0.5rem' }}>سوالات متداول</h1>
      <p className="text-muted" style={{ marginBottom: '3rem' }}>
        پاسخ به سوالاتی که معمولاً از ما می‌پرسند
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
        <h3 className="font-bold" style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>سوال دیگری دارید؟</h3>
        <p style={{ marginBottom: '1rem' }}>
          اگر پاسخ سوال خود را پیدا نکردید، می‌توانید با ما تماس بگیرید.
        </p>
        <Link
          href="https://alirezasafaeisystems.ir/?utm_source=audit&utm_medium=faq&utm_campaign=contact"
          className="button"
          target="_blank"
          rel="noopener noreferrer"
        >
          تماس با ما
        </Link>
      </div>
    </main>
  )
}
