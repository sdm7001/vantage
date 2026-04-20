import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/r/(.*)',
  '/unsubscribe/(.*)',
  '/api/track/(.*)',
  '/api/webhooks/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Block sign-up — redirect to sign-in
  if (request.nextUrl.pathname.startsWith('/sign-up')) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
};
