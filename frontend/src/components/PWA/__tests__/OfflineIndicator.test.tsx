/**
 * @jest-environment jsdom
 */
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { OfflineIndicator } from '../OfflineIndicator';

// `useNetworkStatus` reads `navigator.onLine` and subscribes to `window`
// online/offline events — fine in jsdom but we mock it so each test can
// flip the value deterministically.
// Note: keeps the cast on a single expression so the TSX parser does not
// confuse `<typeof useNetworkStatus>` with JSX.
jest.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

// `jest.Mock` keeps this file free of generic type expressions — the TSX
// transformer otherwise confuses `<typeof useNetworkStatus>` with JSX.
const mockUseNetworkStatus = useNetworkStatus as unknown as jest.Mock;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when online', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: true });
    const { container } = render(<OfflineIndicator />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the banner with role="alert" when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    render(<OfflineIndicator />);

    const banner = await screen.findByRole('alert');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/offline/i);
  });

  it('hides the banner once dismissed and persists the choice', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    render(<OfflineIndicator />);

    const dismiss = await screen.findByRole('button', {
      name: /dismiss offline banner/i,
    });

    await act(async () => {
      fireEvent.click(dismiss);
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    expect(window.localStorage.getItem('aethermint-offline-banner-dismissed')).toBe(
      'true'
    );
  });

  it('honours a custom storage key', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    render(<OfflineIndicator storageKey="custom-dismiss" />);

    const dismiss = await screen.findByRole('button', {
      name: /dismiss offline banner/i,
    });

    await act(async () => {
      fireEvent.click(dismiss);
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('custom-dismiss')).toBe('true');
    });
  });

  it('does not throw when localStorage is unavailable', () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false });
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });

    expect(() => render(<OfflineIndicator />)).not.toThrow();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: original,
    });
  });
});
