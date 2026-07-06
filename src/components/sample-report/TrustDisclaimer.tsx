import type { SampleReportCopy } from "../../lib/sample-report/copy";

type TrustDisclaimerProps = {
  copy: SampleReportCopy;
};

export default function TrustDisclaimer({ copy }: TrustDisclaimerProps) {
  return (
    <section className="card" style={{ borderStyle: "dashed" }}>
      <h2 style={{ fontSize: "1rem" }}>{copy.trustTitle}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>{copy.trustBody}</p>
      {copy.trustDetails && copy.trustDetails.length > 0 && (
        <ul style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
          {copy.trustDetails.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      )}
    </section>
  );
}