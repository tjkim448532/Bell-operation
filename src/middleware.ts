import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Limit the middleware to a dummy path so it doesn't affect performance
export const config = {
  matcher: '/_dummy-middleware-path',
};
