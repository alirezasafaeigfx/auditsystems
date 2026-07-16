import { NextRequest, NextResponse } from "next/server";
import { isNoIndexRoute } from "./src/lib/seoPolicy";

function isHttpsRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) return proto.toLowerCase() === "https";
  return request.nextUrl.protocol === "https:";
}

function withSecurityHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const isApi = request.nextUrl.pathname.startsWith("/api/");

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
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline' https:",
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self' https: wss:",
        "form-action 'self'",
        "frame-src 'none'",
        "media-src 'self' https:",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests"
      ].join("; ")
    );
  }

  if (isApi || isNoIndexRoute(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  if (isHttpsRequest(request)) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fa";
  const requestId =
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID();

  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-correlation-id", requestId);
  requestHeaders.set("x-asdev-locale", locale);
  requestHeaders.set("x-asdev-pathname", pathname);
  requestHeaders.set("x-site-locale", locale);
  requestHeaders.set("x-site-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
  response.headers.set("x-request-id", requestId);
  response.headers.set("x-correlation-id", requestId);
  response.headers.set("x-asdev-locale", locale);
  response.headers.set("x-asdev-pathname", pathname);
  response.headers.set("x-site-locale", locale);
  response.headers.set("x-site-pathname", pathname);

  return withSecurityHeaders(request, response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)"]
};
