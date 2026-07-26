'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface PaletteEntry {
  id: string;
  label: string;
  keywords: string[];
  href: string;
}

const PALETTE_ENTRIES: PaletteEntry[] = [
  { id: 'new-contract', label: 'New Contract', keywords: ['create', 'contract', 'agreement', 'form'], href: '/contracts' },
  { id: 'new-milestone', label: 'New Milestone', keywords: ['create', 'milestone', 'payment', 'progress', 'form'], href: '/milestones' },
  { id: 'contracts', label: 'Go to Contracts', keywords: ['contract', 'list', 'all'], href: '/contracts' },
  { id: 'milestones', label: 'Go to Milestones', keywords: ['milestone', 'list', 'all'], href: '/milestones' },
  { id: 'reputation', label: 'Go to Reputation', keywords: ['reputation', 'score', 'profile'], href: '/reputation' },
];

export default function CommandPalette(): React.JSX.Element {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return PALETTE_ENTRIES;
    const lower = query.toLowerCase();
    return PALETTE_ENTRIES.filter(
      (entry) =>
        entry.label.toLowerCase().includes(lower) ||
        entry.keywords.some((k) => k.includes(lower)),
    );
  }, [query]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
      handleClose();
    },
    [router, handleClose],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key === 'k';
      if (isModK) {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
        return;
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filtered.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        return;
      }

      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        handleNavigate(filtered[activeIndex].href);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, activeIndex, handleOpen, handleClose, handleNavigate]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const activeDescendantId = filtered.length > 0 ? `command-${filtered[activeIndex].id}` : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open command palette"
      >
        Open command palette (Ctrl+K)
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          role="presentation"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center border-b border-slate-200 px-4">
              <svg
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={filtered.length > 0}
                aria-controls="command-palette-listbox"
                aria-activedescendant={activeDescendantId}
                aria-autocomplete="list"
                aria-label="Search commands"
                placeholder="Search commands..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border-none bg-transparent px-3 py-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-400 sm:inline-block">
                ESC
              </kbd>
            </div>

            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-400">
                No results found
              </div>
            ) : (
              <ul
                ref={listRef}
                id="command-palette-listbox"
                role="listbox"
                aria-label="Commands"
                className="max-h-80 overflow-y-auto p-2"
              >
                {filtered.map((entry, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={entry.id}
                      id={`command-${entry.id}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleNavigate(entry.href)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={[
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-100',
                      ].join(' ')}
                    >
                      <span className="font-medium">{entry.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
