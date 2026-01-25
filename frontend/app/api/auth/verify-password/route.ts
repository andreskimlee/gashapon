import { NextRequest, NextResponse } from 'next/server';

// Password is stored as a non-public server-side secret
const SITE_PASSWORD = process.env.SITE_PASSWORD?.trim();

export async function POST(request: NextRequest) {
  if (!SITE_PASSWORD) {
    // If no password is configured, allow access (for development)
    const response = NextResponse.json({ success: true });
    response.cookies.set('site-auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (password?.trim() === SITE_PASSWORD) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('site-auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ error: 'Wrong password!' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
