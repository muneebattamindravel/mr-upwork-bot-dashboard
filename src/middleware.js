import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// List of protected routes
const protectedRoutes = ['/kb', '/dashboard', '/analytics', '/settings'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('authToken')?.value;

  // Allow public routes like /login or static assets
  if (!protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // No token = redirect to login
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verify token (optional: can use secret from env)
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next(); // ✅ Authenticated
  } catch (err) {
    console.error('[Middleware] Invalid token:', err);
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/kb', '/dashboard', '/analytics', '/settings'], // Add other protected paths here
};
