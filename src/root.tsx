// ─────────────────────────────────────────────────────────────
// root.tsx — The HTML document and app shell.
// (Replaces index.html and main.tsx.)
// ─────────────────────────────────────────────────────────────
import { useEffect, useState, type ReactNode } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router';
import type { LinksFunction } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { startClientApp } from './lib/clientBoot';
import { setAppNavigate } from './lib/appNavigate';
import { buildMeta } from './seo/meta';
import './index.css';

export const links: LinksFunction = () => [
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/manifest.webmanifest' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap',
  },
];

export function meta() {
  return buildMeta();
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-title" content="Field Guide" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigate = useNavigate();
  // One QueryClient per app instance (and per page when pre-rendering).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 2,
          },
        },
      }),
  );

  useEffect(() => {
    setAppNavigate((to, options) => navigate(to, options));
    startClientApp();
    return () => setAppNavigate(null);
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}

/** Shown in the SPA fallback page while the app starts in the browser. */
export function HydrateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-texture">
      <img src="/icon-192.png" alt="" width={64} height={64} className="h-16 w-16 animate-pulse opacity-80" />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let title = 'Something went wrong';
  let detail = 'Please refresh the page. If this keeps happening, let us know via the feedback button.';
  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? 'Page not found' : `Error ${error.status}`;
    detail = error.status === 404 ? 'This page has wandered off the map.' : detail;
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <title>{title}</title>
      <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
      <p className="max-w-md text-sm text-mh-slate-400">{detail}</p>
      <a href="/" className="btn-mho-gold rounded-lg !px-4 !py-2 text-sm font-semibold">
        Back to the Field Guide
      </a>
    </main>
  );
}
