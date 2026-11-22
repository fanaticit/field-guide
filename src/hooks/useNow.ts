import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every minute.
 *
 * `initial` is used for the first render so pre-rendered HTML and the
 * browser's first render match (pass the build time); the real clock
 * takes over straight after the page loads.
 */
export function useNow(initial: number, intervalMs = 60_000): number {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}
