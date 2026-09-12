import { NextRequest, NextResponse } from "next/server";
import { isNoIndexRoute } from "./lib/seoPolicy";

const SESSION_COOKIE = "saas_session";
const APP_PREFIX = "/app";

const LOCALE_COOKIE = "audit_locale";

function localeForRequest(request: NextRequest): "fa" | "en" {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/signup") {
    if (request.cookies.get(LOCALE_COOKIE)?.value === "en") return "en";
    const referer = request.headers.get("referer");
    if (referer) {
      const refererPathname = new URL(referer, request.url).pathname;
      if (refererPathname === "/en" || refererPathname.startsWith("/en/")) return "en";
    }
  }
  return "fa";
}

function isHttpsRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.toLowerCase() === "https";
  return request.nextUrl.protocol === "https:";
}

function applyResponsePolicy(
  request: NextRequest,
  response: NextResponse,
  locale: "fa" | "en",
  requestId: string
) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublicIndexable = !isApi && !isNoIndexRoute(pathname);

  response.headers.set("X-Robots-Tag", isPublicIndexable ? "all" : "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", isPublicIndexable ? "public, max-age=0, must-revalidate" : "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-site");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (!isApi) {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
        "font-src 'self'",
        "connect-src 'self' https://www.google-analytics.com https://analytics.google.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ].join("; ")
    );
  }

  if (isHttpsRequest(request)) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  response.headers.set("x-request-id", requestId);
  response.headers.set("x-correlation-id", requestId);
  response.headers.set("x-asdev-locale", locale);
  response.headers.set("x-asdev-pathname", pathname);
  response.headers.set("x-site-locale", locale);
  response.headers.set("x-site-pathname", pathname);
  if (!isApi && request.headers.get("accept")?.includes("text/html")) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = localeForRequest(request);
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID();

  if (pathname.startsWith(APP_PREFIX)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE);
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return applyResponsePolicy(request, NextResponse.redirect(loginUrl), locale, requestId);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-correlation-id", requestId);
  requestHeaders.set("x-asdev-pathname", pathname);
  requestHeaders.set("x-asdev-locale", locale);
  requestHeaders.set("x-site-pathname", pathname);
  requestHeaders.set("x-site-locale", locale);

  return applyResponsePolicy(
    request,
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    locale,
    requestId
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)).*)"],
};
