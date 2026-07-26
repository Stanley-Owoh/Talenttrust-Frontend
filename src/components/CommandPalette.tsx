'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { useMediaQuery } from '@/hooks/useMediaQuery';

type PaletteEntry = {
  id: string;
  label: string;
  href: string;
  keywords: string[];
};

const NAV_ENTRIES: PaletteEntry[] = [
  { id: 'home', label: 'Home', href: '/', keywords: ['home', 'dashboard', 'start'] },
  { id: 'contracts', label: 'Contracts', href: '/contracts', keywords: ['contracts', 'agreements'] },
  { id: 'milestones', label: 'Milestones', href: '/milestones', keywords: ['milestones', 'checkpoints', 'goals'] },
  { id: 'reputation', label: 'Reputation', href: '/reputation', keywords: ['reputation', 'trust', 'score', 'history'] },
];

function matchEntry(query: string, label: string, keywords: string[]): boolean {
  const q = query.toLowerCase();
  if (label.toLowerCase().includes(q)) return true;
  return keywords.some((k) => k.toLowerCase().includes(q));
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const target = e.target as HTMLElement;
        if (typeof target.closest === 'function' && target.closest('input, textarea, select, [contenteditable="true"]')) return;
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: inputRef,
    onEscape: close,
    restoreFocus: true,
  });

  const filtered = query === ''
    ? NAV_ENTRIES
    : NAV_ENTRIES.filter((e) => matchEntry(query, e.label, e.keywords));

  const selectedEntry = filtered.length > 0 ? filtered[selectedIndex] : null;

  const navigate = useCallback(
    (entry: PaletteEntry) => {
      router.push(entry.href);
      close();
    },
    [router, close],
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter' && selectedEntry) {
        e.preventDefault();
        navigate(selectedEntry);
      }
    },
    [filtered.length, selectedEntry, navigate],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className={`absolute inset-0 bg-black/50 ${prefersReducedMotion ? '' : 'backdrop-blur-sm transition-opacity'}`}
        onClick={close}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl"
        onKeyDown={handleListKeyDown}
      >
        <div className="border-b border-[var(--border)] px-4">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
            aria-activedescendant={
              filtered.length > 0 && selectedEntry ? `cp-opt-${selectedEntry.id}` : undefined
            }
            placeholder="Search pages..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent py-4 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <ul id="cp-list" role="listbox" aria-label="Pages" className="p-2">
          {filtered.length === 0 ? (
            <li className="p-4 text-center text-sm text-[var(--muted-foreground)]">No results</li>
          ) : (
            filtered.map((entry, i) => (
              <li
                key={entry.id}
                role="option"
                id={`cp-opt-${entry.id}`}
                aria-selected={i === selectedIndex}
                onClick={() => navigate(entry)}
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  i === selectedIndex
                    ? 'bg-[var(--accent)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
                }`}
              >
                <span className="font-medium">{entry.label}</span>
                <span className="text-xs text-[var(--muted-foreground)]">{entry.href}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
