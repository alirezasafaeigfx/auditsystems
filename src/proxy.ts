import { NextRequest, NextResponse } from "next/server";
import { isNoIndexRoute } from "./lib/seoPolicy";

function localeForPath(pathname: string): "fa" | "en" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fa";
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const locale = localeForPath(request.nextUrl.pathname);

  requestHeaders.set("x-asdev-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-asdev-locale", locale);
  requestHeaders.set("x-site-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-site-locale", locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const isPublicIndexable = !isNoIndexRoute(request.nextUrl.pathname);

  response.headers.set("X-Robots-Tag", isPublicIndexable ? "all" : "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", isPublicIndexable ? "public, max-age=0, must-revalidate" : "private, no-store");

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)).*)"],
};
