'use client';

import React, { useEffect, useId, useRef } from 'react';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

/** Props for the ConfirmDialog component */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog description or message */
  description: string;
  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Dialog tone / severity: "destructive" sets role="alertdialog", "default" sets role="dialog" */
  tone?: 'default' | 'destructive';
  /** Callback when the user confirms the action */
  onConfirm: () => void;
  /** Callback when the user cancels or closes the dialog */
  onCancel: () => void;
}

/**
 * Accessible confirmation dialog.
 *
 * - Focus is moved to the cancel button when opened.
 * - Focus is trapped within the dialog.
 * - Escape key triggers cancel.
 * - After closing, focus returns to the element that opened the dialog (handled by the caller).
 * - Generates unique IDs via useId for title and description.
 * - Supports tone="destructive" (role="alertdialog") or default (role="dialog").
 * - Restricts background content with inert / aria-hidden while open.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const titleId = useId();
  const descriptionId = useId();

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: cancelBtnRef,
    onEscape: onCancel,
    restoreFocus: true,
  });

  useEffect(() => {
    if (!isOpen) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const elementsToHide: { element: HTMLElement; prevAriaHidden: string | null; prevInert: boolean }[] = [];

    Array.from(document.body.children).forEach((node) => {
      if (node instanceof HTMLElement && !node.contains(overlay) && node !== overlay) {
        elementsToHide.push({
          element: node,
          prevAriaHidden: node.getAttribute('aria-hidden'),
          prevInert: node.inert ?? false,
        });
      }
    });

    let curr: HTMLElement | null = overlay;
    while (curr && curr.parentElement && curr.parentElement !== document.body) {
      const parent: HTMLElement = curr.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (sibling !== curr && sibling instanceof HTMLElement && !sibling.contains(overlay)) {
          if (!elementsToHide.some((item) => item.element === sibling)) {
            elementsToHide.push({
              element: sibling,
              prevAriaHidden: sibling.getAttribute('aria-hidden'),
              prevInert: sibling.inert ?? false,
            });
          }
        }
      });
      curr = parent;
    }

    elementsToHide.forEach(({ element }) => {
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
      element.inert = true;
    });

    return () => {
      elementsToHide.forEach(({ element, prevAriaHidden, prevInert }) => {
        if (prevAriaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', prevAriaHidden);
        }
        if (!prevInert) {
          element.removeAttribute('inert');
          element.inert = false;
        }
      });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role={tone === 'destructive' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl p-6 border border-gray-200"
      >
        <h2 id={titleId} className="text-lg font-semibold mb-4">
          {title}
        </h2>
        <p id={descriptionId} className="text-sm text-gray-700 mb-6">{description}</p>
        <div className="flex justify-end space-x-3">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
