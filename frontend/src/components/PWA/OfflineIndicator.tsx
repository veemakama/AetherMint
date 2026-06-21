/**
 * OfflineIndicator
 * -------------------------------------------------------------------------
 * Fixed bottom banner rendered whenever `useNetworkStatus` reports an offline
 * state. The component is loaded from `_app.tsx` via
 * `next/dynamic(..., { ssr: false })` so the first paint always happens on
 * the client — that lets `useNetworkStatus` read `navigator.onLine` without
 * producing a hydration mismatch.
 *
 * UX notes:
 *   • Users can dismiss the banner; the choice persists in `localStorage`
 *     under `storageKey` so we don't annoy them every refresh.
 *   • The dismiss button is keyboard-reachable and labelled for screen
 *     readers.
 *   • Color tokens match the application's Tailwind palette (amber).
 */

import { useState } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const DEFAULT_STORAGE_KEY = 'aethermint-offline-banner-dismissed';

interface OfflineIndicatorProps {
  /**
   * Override the localStorage key used to remember that the user dismissed
   * the banner. Mostly useful for tests / storybooks.
   */
  storageKey?: string;
}

const safeGetItem = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // localStorage can throw in private mode / sandboxed iframes.
    return null;
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* intentionally ignored */
  }
};

export function OfflineIndicator({
  storageKey = DEFAULT_STORAGE_KEY,
}: OfflineIndicatorProps) {
  const { isOnline } = useNetworkStatus();
  const [dismissed, setDismissed] = useState<boolean>(
    () => safeGetItem(storageKey) === 'true'
  );

  const handleDismiss = () => {
    safeSetItem(storageKey, 'true');
    setDismissed(true);
  };

  if (isOnline || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 transform bg-amber-500 text-amber-950 shadow-lg transition-transform duration-200 ease-out"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 flex-shrink-0"
            aria-hidden="true"
          >
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
          <span className="truncate text-sm font-medium sm:text-base">
            You&rsquo;re offline &mdash; cached content remains available and
            progress will sync automatically once you&rsquo;re back online.
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss offline banner"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-amber-900 transition hover:bg-amber-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default OfflineIndicator;
