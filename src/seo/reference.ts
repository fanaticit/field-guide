// Helpers shared by the reference route modules.
import { REFERENCE_KINDS, type ReferenceKind } from './pages';

export function kindFromPath(pathname: string): ReferenceKind | null {
  const first = pathname.split('/').filter(Boolean)[0] as ReferenceKind | undefined;
  return first && (REFERENCE_KINDS as string[]).includes(first) ? first : null;
}

/**
 * The page path a loader is running for. React Router 8 passes the raw
 * request (which ends in ".data" for data requests) plus a cleaned `url`.
 */
export function loaderPath(args: { request: Request; url?: URL }): string {
  const pathname = args.url instanceof URL ? args.url.pathname : new URL(args.request.url).pathname;
  return pathname.replace(/\.data$/, '').replace(/\/_root$/, '/');
}
