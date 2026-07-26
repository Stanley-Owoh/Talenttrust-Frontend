'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { getRegisteredCommands, type PaletteCommand } from '@/lib/commands/registry';

function matches(command: PaletteCommand, query: string): boolean {
  if (query.trim() === '') return true;
  const haystack = [command.label, ...command.keywords].join(' ').toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

/**
 * CommandPalette — a keyboard-operable, searchable list of app-wide actions.
 *
 * Opens via the visible trigger button or the Ctrl/Cmd+K shortcut from
 * anywhere in the app. Filters registered commands (see
 * `src/lib/commands/registry.ts`) by label and keywords, and navigates to
 * the selected command's route on activation.
 */
export default function CommandPalette(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const listboxId = useId();
  const titleId = useId();

  const commands = useMemo(() => getRegisteredCommands(), [isOpen]);
  const results = useMemo(
    () => commands.filter((command) => matches(command, query)),
    [commands, query],
  );

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const activate = (command: PaletteCommand) => {
    router.push(command.href);
    close();
  };

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: inputRef,
    onEscape: close,
    restoreFocus: true,
  });

  // Global Ctrl/Cmd+K shortcut, available regardless of open state.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, isOpen]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (results.length === 0 ? 0 : (current + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length === 0 ? 0 : (current - 1 + results.length) % results.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) activate(selected);
    }
  };

  const activeOptionId = results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open command palette"
        className="fixed bottom-6 right-24 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--card)] px-4 text-sm font-medium text-[var(--foreground)] shadow-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors z-40 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
      >
        Search
        <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-xs">
          Ctrl K
        </kbd>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden pt-24">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-xl"
          >
            <h2 id={titleId} className="sr-only">
              Command palette
            </h2>
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              autoComplete="off"
              placeholder="Type a command..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              className="w-full rounded-t-lg border-b border-[var(--border)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] outline-none"
            />
            <ul id={listboxId} role="listbox" aria-label="Commands" className="max-h-72 overflow-y-auto py-1">
              {results.length === 0 ? (
                <li className="px-4 py-3 text-sm text-[var(--muted-foreground)]">No matching commands</li>
              ) : (
                results.map((command, index) => (
                  <li
                    key={command.id}
                    id={`${listboxId}-${command.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activate(command)}
                    className={[
                      'cursor-pointer px-4 py-2 text-sm',
                      index === activeIndex
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'text-[var(--foreground)]',
                    ].join(' ')}
                  >
                    {command.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
