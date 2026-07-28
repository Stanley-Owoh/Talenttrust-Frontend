import { renderHook, act } from '@testing-library/react';
import { useCopyToClipboard } from '../useCopyToClipboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockClipboard(impl: () => Promise<void> = () => Promise.resolve()) {
  const writeText = jest.fn().mockImplementation(impl);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('useCopyToClipboard', () => {
  let originalClipboard: typeof navigator.clipboard;
  let execCommandSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    originalClipboard = navigator.clipboard;
    // Provide a default execCommand spy that returns true (success)
    execCommandSpy = jest
      .spyOn(document, 'execCommand')
      .mockReturnValue(true);
  });

  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
    execCommandSpy.mockRestore();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  // ── 1. Clipboard API — success path ───────────────────────────────────────

  describe('Clipboard API — success path', () => {
    it('copies text successfully and returns true', async () => {
      const writeText = mockClipboard();
      const { result } = renderHook(() => useCopyToClipboard());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('hello world');
      });

      expect(success).toBe(true);
      expect(writeText).toHaveBeenCalledWith('hello world');
    });

    it('sets copied to true immediately after a successful copy', async () => {
      mockClipboard();
      const { result } = renderHook(() => useCopyToClipboard());

      expect(result.current.copied).toBe(false);

      await act(async () => {
        await result.current.copy('text');
      });

      expect(result.current.copied).toBe(true);
    });

    it('resets copied to false after the configured delay', async () => {
      mockClipboard();
      const { result } = renderHook(() => useCopyToClipboard({ delay: 1000 }));

      await act(async () => {
        await result.current.copy('text');
      });
      expect(result.current.copied).toBe(true);

      act(() => { jest.advanceTimersByTime(999); });
      expect(result.current.copied).toBe(true);

      act(() => { jest.advanceTimersByTime(1); });
      expect(result.current.copied).toBe(false);
    });

    it('uses the default delay of 2000 ms when delay is not specified', async () => {
      mockClipboard();
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('text');
      });

      act(() => { jest.advanceTimersByTime(1999); });
      expect(result.current.copied).toBe(true);

      act(() => { jest.advanceTimersByTime(1); });
      expect(result.current.copied).toBe(false);
    });

    it('calls onSuccess callback on successful copy', async () => {
      mockClipboard();
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

      await act(async () => {
        await result.current.copy('text');
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('does not call onError on successful copy', async () => {
      mockClipboard();
      const onError = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onError }));

      await act(async () => {
        await result.current.copy('text');
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });

  // ── 2. execCommand fallback — Clipboard API unavailable ──────────────────

  describe('execCommand fallback — Clipboard API unavailable', () => {
    it('uses the fallback when navigator.clipboard is undefined', async () => {
      removeClipboard();
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('fallback text');
      });

      expect(success).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('uses the fallback when navigator.clipboard exists but writeText is missing', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {}, // clipboard without writeText
      });
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('text');
      });

      expect(success).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('sets copied to true after a successful fallback copy', async () => {
      removeClipboard();
      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('text');
      });

      expect(result.current.copied).toBe(true);
    });

    it('resets copied to false after the delay following a fallback copy', async () => {
      removeClipboard();
      const { result } = renderHook(() => useCopyToClipboard({ delay: 1000 }));

      await act(async () => {
        await result.current.copy('text');
      });

      act(() => { jest.advanceTimersByTime(1000); });
      expect(result.current.copied).toBe(false);
    });

    it('falls through to the fallback when Clipboard API throws', async () => {
      mockClipboard(() => Promise.reject(new Error('Permission denied')));
      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onSuccess }));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('text');
      });

      // Clipboard API threw → fallback succeeded
      expect(success).toBe(true);
      expect(execCommandSpy).toHaveBeenCalledWith('copy');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // ── 3. Both paths fail ────────────────────────────────────────────────────

  describe('both copy paths fail', () => {
    it('calls onError and returns false when Clipboard API and fallback both fail', async () => {
      // Clipboard API rejects
      mockClipboard(() => Promise.reject(new Error('denied')));
      // execCommand fallback returns false
      execCommandSpy.mockReturnValue(false);

      const onError = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onError }));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('text');
      });

      expect(success).toBe(false);
      expect(result.current.copied).toBe(false);
      expect(onError).toHaveBeenCalledTimes(1);
      expect((onError.mock.calls[0][0] as Error).message).toContain('supported');
    });

    it('calls onError and returns false when clipboard is absent and fallback fails', async () => {
      removeClipboard();
      execCommandSpy.mockReturnValue(false);

      const onError = jest.fn();
      const { result } = renderHook(() => useCopyToClipboard({ onError }));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('text');
      });

      expect(success).toBe(false);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('does not set copied to true when both paths fail', async () => {
      removeClipboard();
      execCommandSpy.mockReturnValue(false);

      const { result } = renderHook(() => useCopyToClipboard());

      await act(async () => {
        await result.current.copy('text');
      });

      expect(result.current.copied).toBe(false);
    });
  });

  // ── 4. SSR guard ──────────────────────────────────────────────────────────

  describe('SSR guard', () => {
    it('returns false and calls onError when navigator.clipboard is absent (SSR-like)', async () => {
      removeClipboard();
      execCommandSpy.mockReturnValue(false); // also kill fallback
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useCopyToClipboard({ onError }),
      );

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.copy('text');
      });

      expect(success).toBe(false);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  // ── 5. Timer management ───────────────────────────────────────────────────

  describe('timer management', () => {
    it('clears the existing timer when copy is called again within the delay window', async () => {
      mockClipboard();
      const { result } = renderHook(() => useCopyToClipboard({ delay: 1000 }));

      await act(async () => { await result.current.copy('first'); });
      act(() => { jest.advanceTimersByTime(500); });

      // Second copy while first timer is still running
      await act(async () => { await result.current.copy('second'); });
      expect(result.current.copied).toBe(true);

      act(() => { jest.advanceTimersByTime(600); });
      // 600 ms since second copy — still within its 1000 ms window
      expect(result.current.copied).toBe(true);

      act(() => { jest.advanceTimersByTime(400); });
      // 1000 ms since second copy — now reset
      expect(result.current.copied).toBe(false);
    });

    it('cleans up the timer on unmount without causing state updates', async () => {
      mockClipboard();
      const { result, unmount } = renderHook(() =>
        useCopyToClipboard({ delay: 1000 }),
      );

      await act(async () => { await result.current.copy('text'); });
      expect(result.current.copied).toBe(true);

      unmount();

      // Should not throw or cause act() warnings
      act(() => { jest.advanceTimersByTime(1000); });
    });
  });
});
