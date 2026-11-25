import { useEffect, useState } from 'react';

/**
 * False during pre-rendering and the browser's first render, true right
 * after. Use it to show browser-only tools without a hydration mismatch.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
