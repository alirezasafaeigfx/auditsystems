type Testimonial = {
  name: string;
  role: string;
  text: string;
  rating: number;
};

const testimonials: Testimonial[] = [
  {
    name: "محمد رضایی",
    role: "مدیر فنی فروشگاه آنلاین",
    text: "ارزیابی سایت به ما کمک کرد مشکلات مخفی سئو را پیدا کنیم. بعد از اصلاح، ترافیک ارگانیک ۴۰٪ افزایش یافت.",
    rating: 5,
  },
  {
    name: "سارا احمدی",
    role: "مدیر محصول شرکت نوپا",
    text: "گزارش بسیار ساده و قابل فهم بود. حتی تیم غیرفنی ما توانست مشکلات را درک کند و اقدام کند.",
    rating: 5,
  },
  {
    name: "علی محمدی",
    role: "توسعه‌دهنده فول‌استک",
    text: "بهترین ابزار ارزیابی فنی که استفاده کردم. راه حل‌ها واقعاً عملی و قابل اجرا هستند.",
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="testimonial-rating" aria-label={`${rating} از ۵ ستاره`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "star filled" : "star"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="testimonials-section" aria-label="نظرات مشتریان">
      <h2>مشتریان ما چه می‌گویند</h2>
      <div className="testimonials-grid">
        {testimonials.map((t) => (
          <article key={t.name} className="testimonial-card">
            <StarRating rating={t.rating} />
            <blockquote className="testimonial-text">{t.text}</blockquote>
            <div className="testimonial-author">
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
