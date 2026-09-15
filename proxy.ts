import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Public pages
        if (pathname === '/' || pathname === '/login' || pathname === '/register') return true;
        // NextAuth API routes
        if (pathname.startsWith('/api/auth')) return true;
        // Registration endpoint is public (POST /api/users)
        if (pathname === '/api/users') return true;
        // All other routes require auth token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg).*)',
  ],
};
