'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { useWallet } from '@/contexts/WalletContext';
import {
  assertNoDuplicateActionIds,
  getCommandPaletteActions,
  matchesCommandPaletteQuery,
} from '@/lib/commandPaletteActions';

/**
 * Global command palette.
 *
 * Mounted once in `src/app/layout.tsx` (alongside `SettingsTrigger`) so it is
 * reachable from every page. Opens via the floating trigger button or the
 * Ctrl+K / Cmd+K keyboard shortcut. Typing filters the registered actions by
 * label or keyword; Enter (or a click) activates the highlighted action.
 */
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { connect } = useWallet();

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const actions = useMemo(() => {
    const registered = getCommandPaletteActions({ connectWallet: connect });
    assertNoDuplicateActionIds(registered);
    return registered;
  }, [connect]);

  const results = useMemo(
    () => actions.filter((action) => matchesCommandPaletteQuery(action, query)),
    [actions, query],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: inputRef,
    onEscape: close,
  });

  // Global shortcut: Ctrl+K (Windows/Linux) or Cmd+K (macOS) toggles the palette.
  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const runAction = useCallback(
    (index: number) => {
      const action = results[index];
      if (!action) return;
      action.perform();
      close();
    },
    [results, close],
  );

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (results.length === 0 ? 0 : (index - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runAction(activeIndex);
    }
  }

  const activeOptionId =
    results[activeIndex] !== undefined ? `${listboxId}-option-${results[activeIndex].id}` : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-24 p-3 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg hover:scale-110 transition-transform z-40 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
        aria-label="Open command palette"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="relative z-10 w-full max-w-lg bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              role="combobox"
              aria-expanded="true"
              aria-haspopup="listbox"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={activeOptionId}
              placeholder="Type a command..."
              className="w-full px-4 py-3 border-b border-gray-200 text-sm focus:outline-none"
            />
            <ul id={listboxId} role="listbox" aria-label="Commands" className="max-h-72 overflow-y-auto">
              {results.length === 0 && (
                <li className="px-4 py-3 text-sm text-gray-500">No matching commands</li>
              )}
              {results.map((action, index) => (
                <li
                  key={action.id}
                  id={`${listboxId}-option-${action.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => runAction(index)}
                  className={`px-4 py-3 text-sm cursor-pointer ${
                    index === activeIndex ? 'bg-slate-100' : ''
                  }`}
                >
                  {action.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
