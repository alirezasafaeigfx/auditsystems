"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitQualification } from "../../lib/qualification-submit";
import { qualificationCopy, type QualificationLocale } from "../../lib/qualification-copy";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function QualificationForm({ locale = "fa" }: { locale?: QualificationLocale }) {
  const copy = qualificationCopy(locale);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [source, setSource] = useState({
    leadSource: "direct",
    sourcePlacement: "qualification_page",
    sourceOffer: "request_assessment",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSource({
      leadSource: params.get("source") ?? params.get("utm_source") ?? "direct",
      sourcePlacement: params.get("placement") ?? params.get("utm_content") ?? "qualification_page",
      sourceOffer: params.get("offer") ?? "request_assessment",
    });
  }, []);

  useEffect(() => {
    if (state.kind === "error") errorRef.current?.focus();
  }, [state.kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });
    const form = new FormData(event.currentTarget);

    const result = await submitQualification({
        domain: form.get("domain"),
        contact: form.get("contact"),
        name: form.get("name"),
        phone: form.get("phone"),
        company: form.get("company"),
        businessType: form.get("businessType"),
        primaryConcern: form.get("primaryConcern"),
        consentPrivacy: form.get("consentPrivacy") === "on",
        ...source,
        submitEventId: `lead_submit_${Date.now()}`,
    });

    if (!result.ok) {
      setState({ kind: "error", message: copy.errors[result.code as keyof typeof copy.errors] ?? copy.errors.fallback });
      return;
    }

    setState({ kind: "success" });
  }

  if (state.kind === "success") {
    return (
      <section className="card hero" aria-live="polite">
        <span className="badge">{copy.successBadge}</span>
        <h1>{copy.successTitle}</h1>
        <p>{copy.successBody}</p>
        <div className="hero-actions">
          <Link href={copy.sampleHref} className="button secondary">{copy.sample}</Link>
          <Link href={copy.homeHref} className="button">{copy.home}</Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid" aria-label={copy.formLabel}>
      <label>
        {copy.domain}
        <input name="domain" inputMode="url" placeholder="https://example.com" required />
      </label>
      <label>
        {copy.email}
        <input name="contact" type="email" placeholder="name@example.com" required />
      </label>
      <div className="grid-2">
        <label>
          {copy.name}
          <input name="name" autoComplete="name" />
        </label>
        <label>
          {copy.phone}
          <input name="phone" autoComplete="tel" />
        </label>
      </div>
      <div className="grid-2">
        <label>
          {copy.company}
          <input name="company" autoComplete="organization" />
        </label>
        <label>
          {copy.businessType}
          <select name="businessType" required defaultValue="">
            <option value="" disabled>{copy.select}</option>
            {(["ecommerce", "agency", "content", "saas", "corporate", "other"] as const).map((value, index) => <option key={value} value={value}>{copy.options[index]}</option>)}
          </select>
        </label>
      </div>
      <label>
        {copy.concern}
        <textarea
          name="primaryConcern"
          rows={5}
          minLength={12}
          placeholder={copy.concernPlaceholder}
          required
        />
      </label>
      <label className="checkbox-row">
        <input name="consentPrivacy" type="checkbox" required />
        <span>{copy.consent}</span>
      </label>
      {state.kind === "error" ? <p ref={errorRef} role="alert" tabIndex={-1} className="status-note is-danger">{state.message}</p> : null}
      <button type="submit" disabled={state.kind === "submitting"}>
        {state.kind === "submitting" ? copy.submitting : state.kind === "error" ? copy.retry : copy.submit}
      </button>
    </form>
  );
}
