import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const session = request.cookies.get('admin_session')
  const isLoginPage = request.nextUrl.pathname === '/admin/login'

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
