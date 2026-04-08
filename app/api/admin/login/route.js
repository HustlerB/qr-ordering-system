import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const password = body.password || ''

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid password.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set('admin_auth', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12,
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
