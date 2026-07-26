'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** A single navigable route shown in the command palette. */
interface CommandRoute {
  href: string;
  label: string;
  keywords: string[];
}

const ROUTES: CommandRoute[] = [
  { href: '/contracts', label: 'Contracts', keywords: ['contracts', 'escrow', 'payments'] },
  { href: '/milestones', label: 'Milestones', keywords: ['milestones', 'milestone', 'tasks'] },
  { href: '/reputation', label: 'Reputation', keywords: ['reputation', 'profile', 'rating'] },
];

/**
 * Simple fuzzy match: returns true when every character in `query`
 * appears in `text` in order (case-insensitive).
 */
function fuzzyMatch(query: string, text: string): boolean {
  const lower = query.toLowerCase();
  const target = text.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < lower.length; ti++) {
    if (target[ti] === lower[qi]) qi++;
  }
  return qi === lower.length;
}

/**
 * CommandPalette — keyboard-driven route navigator.
 *
 * Opens on Cmd+K (Mac) / Ctrl+K and closes on Escape.
 * Lists all primary routes with fuzzy filtering and arrow-key
 * navigation. Respects `prefers-reduced-motion` for open/close
 * transitions.
 *
 * @example
 * ```tsx
 * // In src/app/layout.tsx
 * <CommandPalette />
 * ```
 */
export default function CommandPalette(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const inputId = useId();
  const listboxId = useId();

  const filteredRoutes = useMemo(() => {
    if (!query.trim()) return ROUTES;
    return ROUTES.filter(
      (route) =>
        fuzzyMatch(query, route.label) ||
        route.keywords.some((kw) => fuzzyMatch(query, kw)),
    );
  }, [query]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    const trigger = previousFocusRef.current;
    if (trigger && document.contains(trigger)) {
      trigger.focus();
    }
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            previousFocusRef.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setQuery('');
            setActiveIndex(0);
          } else {
            const trigger = previousFocusRef.current;
            if (trigger && document.contains(trigger)) {
              trigger.focus();
            }
          }
          return !prev;
        });
        return;
      }

      if (e.key === 'Escape') {
        setIsOpen((prev) => {
          if (!prev) return prev;
          const trigger = previousFocusRef.current;
          if (trigger && document.contains(trigger)) {
            trigger.focus();
          }
          return false;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      // Small delay so the DOM is painted before we focus
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filteredRoutes.length, query]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredRoutes.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev <= 0 ? filteredRoutes.length - 1 : prev - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredRoutes[activeIndex]) {
          navigateTo(filteredRoutes[activeIndex].href);
        }
        break;
    }
  };

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen) return;
    const option = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    if (option && typeof option.scrollIntoView === 'function') {
      option.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen]);

  if (!isOpen) return <></>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ${
          prefersReducedMotion ? '' : 'animate-in fade-in zoom-in-95'
        }`}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-slate-200 px-4">
          <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={
              filteredRoutes[activeIndex]
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-label="Search routes"
            placeholder="Search routes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="w-full bg-transparent px-3 py-4 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Route list */}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Navigation routes"
          className="max-h-60 overflow-y-auto p-2"
        >
          {filteredRoutes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No routes found.
            </p>
          ) : (
            filteredRoutes.map((route, index) => {
              const isActive = index === activeIndex;
              const optionId = `${listboxId}-option-${index}`;
              return (
                <button
                  key={route.href}
                  id={optionId}
                  role="option"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => navigateTo(route.href)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium">{route.label}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {route.href}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-400">
          <span>Navigate with ↑↓</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
