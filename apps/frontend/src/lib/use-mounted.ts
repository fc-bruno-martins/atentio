'use client'

import { useSyncExternalStore } from 'react'

// Never re-subscribes — the value flips exactly once (server→client) and never
// changes again, so there is nothing to notify.
const noopSubscribe = () => () => {}

/**
 * `true` only after client-side hydration, `false` on the server and during the
 * first (hydration) client render.
 *
 * This is the hydration-safe replacement for the `const [mounted, setMounted] =
 * useState(false); useEffect(() => setMounted(true), [])` idiom flagged by
 * `react-hooks/set-state-in-effect`. `useSyncExternalStore` returns the server
 * snapshot (`false`) during SSR and hydration — so the markup matches — then the
 * client snapshot (`true`) on the next render, with no setState inside an effect.
 *
 * Typical use: gate a `createPortal(...)`/`document`-dependent subtree so it only
 * renders on the client (`if (!mounted) return null`).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}
