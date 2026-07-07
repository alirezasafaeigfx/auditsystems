"use client";

import { useEffect, useState } from "react";

export default function SocialProofCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.successfulAudits > 0) {
          setCount(data.successfulAudits);
        }
      })
      .catch(() => {});
  }, []);

  if (count === null) return null;

  return (
    <div className="social-proof-counter" aria-label={`${count} ارزیابی موفق انجام شده`}>
      <span className="counter-live-dot" aria-hidden="true" />
      <strong className="counter-number">{count.toLocaleString("fa-IR")}+</strong>
      <span className="counter-label">ارزیابی موفق</span>
    </div>
  );
}
