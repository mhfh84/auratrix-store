'use client';

import { useState, useEffect } from 'react';

/**
 * useHydrated
 * ───────────
 * Returns `true` only after the component has mounted on the client.
 * Use this to avoid SSR/hydration mismatches for localStorage-backed stores
 * (Zustand persist, etc.) that should only read from the client.
 *
 * @example
 *   const hydrated = useHydrated();
 *   if (!hydrated) return <Skeleton />;
 *   return <RealComponent />;
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
