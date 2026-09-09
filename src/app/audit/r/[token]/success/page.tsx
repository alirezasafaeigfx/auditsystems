import Link from "next/link";
import SeoPageEvent from "../../../../../components/SeoPageEvent";

export default async function SuccessPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ orderId?: string; dl?: string; downloadUrl?: string }> }) {
  const { token } = await params;
  const query = await searchParams;

  const orderId = query.orderId ?? null;
  const downloadHref = orderId ? `/api/pdf/${token}` : null;

  return (
    <main>
      <SeoPageEvent event="seo_payment_success" params={{ locale: "fa", path: `/audit/r/${token}/success` }} />
      <section className="card">
        <h1>پرداخت موفق</h1>
        <p>سفارش شما با موفقیت تکمیل شد.</p>
        {orderId ? <p>شناسه سفارش: {orderId}</p> : null}
        {downloadHref ? (
          <p>
            <Link href={downloadHref}>دانلود گزارش PDF</Link>
          </p>
        ) : (
          <p>لینک دانلود پس از تایید پرداخت در دسترس خواهد بود.</p>
        )}
      </section>
    </main>
  );
}
