type ReportUseCase = {
  title: string;
  text: string;
};

const reportUseCases: ReportUseCase[] = [
  {
    title: "اولویت‌بندی مشکلات",
    text: "یافته‌های فنی را بر اساس شدت، شواهد و اقدام بعدی مرتب کنید تا تیم بداند از کجا شروع کند.",
  },
  {
    title: "هماهنگی تیم فنی و کسب‌وکار",
    text: "مشاهده فنی، اثر احتمالی و روش بررسی را کنار هم ببینید و درباره اقدام بعدی تصمیم بگیرید.",
  },
  {
    title: "پیگیری اصلاحات",
    text: "پیشنهادهای عملی و روش اعتبارسنجی را به وظایف قابل‌پیگیری برای توسعه، محتوا و زیرساخت تبدیل کنید.",
  },
];

export default function Testimonials() {
  return (
    <section className="testimonials-section" aria-label="کاربردهای گزارش ممیزی">
      <h2>این گزارش به چه تصمیم‌هایی کمک می‌کند؟</h2>
      <div className="testimonials-grid">
        {reportUseCases.map((item) => (
          <article key={item.title} className="testimonial-card">
            <blockquote className="testimonial-text">{item.text}</blockquote>
            <div className="testimonial-author">
              <strong>{item.title}</strong>
              <span>نمونه کاربرد گزارش</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
