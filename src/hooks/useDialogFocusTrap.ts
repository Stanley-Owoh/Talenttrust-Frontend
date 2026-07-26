'use client';

import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseDialogFocusTrapOptions {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  onEscape: () => void;
  restoreFocus?: boolean;
}

/**
 * Applies the shared keyboard-focus behavior used by modal dialogs.
 *
 * While open, focus moves to `initialFocusRef`, Tab and Shift+Tab wrap at the
 * dialog boundaries, and Escape invokes `onEscape`. When `restoreFocus` is
 * enabled, the element focused immediately before opening receives focus when
 * the dialog closes or unmounts.
 */
export function useDialogFocusTrap({
  isOpen,
  dialogRef,
  initialFocusRef,
  onEscape,
  restoreFocus = false,
}: UseDialogFocusTrapOptions): void {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (initialFocusRef.current instanceof HTMLElement) {
      initialFocusRef.current.focus();
    } else if (dialogRef.current instanceof HTMLElement) {
      dialogRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      const trigger = triggerRef.current;
      if (restoreFocus && trigger && document.contains(trigger)) {
        trigger.focus();
      }
    };
  }, [dialogRef, initialFocusRef, isOpen, onEscape, restoreFocus]);
}
