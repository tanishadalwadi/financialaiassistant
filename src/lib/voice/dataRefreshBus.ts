/**
 * Tiny pub/sub used to invalidate cached data across hook instances after a
 * voice action mutates Supabase.
 *
 * Why this exists:
 *   - Each tab screen owns its own `useGoalsTransactions` instance (and so its
 *     own `categoryBudgetCaps`, `goals`, `transactions` state).
 *   - The voice executor calls the hook helpers bound to whichever screen
 *     most recently registered an action context — that screen reloads, but
 *     sibling screens still render stale local copies until next focus.
 *   - Emitting on the bus lets every live hook instance reload itself in
 *     parallel, so the screen the user is looking at reflects the change
 *     immediately.
 *
 * Pure module — no React, no Supabase. Safe to import from anywhere.
 */
type Listener = () => void | Promise<void>;

const listeners = new Set<Listener>();

export function onVoiceDataChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitVoiceDataChanged(): void {
  // Snapshot first so listeners that unsubscribe themselves during a
  // refresh don't trip the iteration.
  const snapshot = Array.from(listeners);
  for (const fn of snapshot) {
    try {
      void fn();
    } catch {
      // Swallow — a failing listener should never break the others.
    }
  }
}
