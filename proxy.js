import { NextResponse } from 'next/server'

export function proxy(request) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin')) {
    const isAuthed = request.cookies.get('admin_auth')?.value === '1'

    if (!isAuthed) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
