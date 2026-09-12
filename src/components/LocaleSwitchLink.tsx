"use client";

import type { ReactNode } from "react";
import Link from "next/link";

export default function LocaleSwitchLink({
  children,
  href,
  shared,
  targetLocale,
}: {
  children: ReactNode;
  href: string;
  shared: boolean;
  targetLocale: "fa" | "en";
}) {
  return (
    <Link
      className="lang-switch"
      href={href}
      onClick={shared ? (event) => {
        event.preventDefault();
        document.cookie = `audit_locale=${targetLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
        window.location.assign(href);
      } : undefined}
    >
      {children}
    </Link>
  );
}
