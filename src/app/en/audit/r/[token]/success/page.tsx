import Link from "next/link";
import SeoPageEvent from "../../../../../../components/SeoPageEvent";

export default async function SuccessPageEn({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ orderId?: string; dl?: string; downloadUrl?: string }> }) {
  const { token } = await params;
  const query = await searchParams;

  const orderId = query.orderId ?? null;
  const downloadHref = orderId ? `/api/pdf/${token}` : null;

  return (
    <main>
      <SeoPageEvent event="seo_payment_success" params={{ locale: "en", path: `/en/audit/r/${token}/success` }} />
      <section className="card">
        <h1>Payment success</h1>
        <p>Your order completed successfully.</p>
        {orderId ? <p>Order: {orderId}</p> : null}
        {downloadHref ? <p><Link href={downloadHref}>Download PDF report</Link></p> : <p>Download link will be available after payment verification.</p>}
      </section>
    </main>
  );
}
