import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from './lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow /admin/login through without auth check
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createMiddlewareSupabaseClient(request, response);

  // getUser() validates the token server-side and refreshes it if expired.
  // This also writes updated session cookies onto the response via setAll.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
