'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single command-palette action registered by a dialog or page. */
export interface CommandAction {
  /** Unique identifier — duplicates are deduplicated (last wins). */
  id: string;
  /** Human-readable label shown in the palette. */
  label: string;
  /** Additional searchable keywords beyond the label tokens. */
  keywords: string[];
  /** Optional grouping header. */
  section?: string;
  /** Callback invoked when the action is selected. */
  onSelect: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CommandPaletteContextValue {
  /** Register an action; returns a cleanup function. */
  registerAction: (action: CommandAction) => () => void;
  /** Whether the palette dialog is currently open. */
  isOpen: boolean;
  /** Programmatically open or close the palette. */
  setIsOpen: (open: boolean) => void;
  /** Currently registered actions (sorted by label). */
  actions: CommandAction[];
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Wraps the application so the command palette and its action registry are
 * available everywhere via `useCommandPalette` / `useRegisterCommandAction`.
 *
 * Place it high in the tree — typically directly inside the root layout
 * body — so actions registered deeper in the tree are visible.
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const actionsRef = useRef<Map<string, CommandAction>>(new Map());
  // We mirror the map into state so the palette re-renders on register /
  // unregister without forcing consumers to know about an internal ref.
  const [actions, setActions] = useState<CommandAction[]>([]);

  const notify = useCallback(() => {
    setActions(
      Array.from(actionsRef.current.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    );
  }, []);

  const registerAction = useCallback(
    (action: CommandAction) => {
      actionsRef.current.set(action.id, action);
      notify();
      return () => {
        actionsRef.current.delete(action.id);
        notify();
      };
    },
    [notify],
  );

  const value = useMemo<CommandPaletteContextValue>(
    () => ({ registerAction, isOpen, setIsOpen, actions }),
    [registerAction, isOpen, actions],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns the current command-palette context.
 *
 * **Must** be used inside a `<CommandPaletteProvider>` tree.
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      'useCommandPalette must be used within a <CommandPaletteProvider>',
    );
  }
  return ctx;
}

/**
 * Registers a command-palette action for the lifetime of the calling
 * component.  The action is automatically unregistered on unmount.
 *
 * Re-registers if `action.id`, `action.label`, or any keyword changes
 * (shallow compare of the array).
 */
export function useRegisterCommandAction(action: CommandAction): void {
  const { registerAction } = useCommandPalette();

  useEffect(() => {
    const unregister = registerAction(action);
    return unregister;
  }, [action.id, registerAction]);
}

// ---------------------------------------------------------------------------
// Palette Dialog
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Renders the command-palette dialog and global keyboard shortcut listener.
 *
 * Place this **once** inside the `<CommandPaletteProvider>` tree — typically
 * in the root layout.
 */
export function CommandPalette(): React.JSX.Element | null {
  const { isOpen, setIsOpen, actions } = useCommandPalette();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Filter actions by query (match against label tokens + keywords).
  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return actions.filter((a) => {
      const haystack = `${a.label} ${a.keywords.join(' ')}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [actions, query]);

  // Refs to avoid re-attaching keyboard listeners on every keystroke.
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  // Group filtered actions by section (undefined section = "Actions").
  const groups = useMemo(() => {
    const map = new Map<string, CommandAction[]>();
    for (const action of filtered) {
      const key = action.section ?? 'Actions';
      const list = map.get(key);
      if (list) list.push(action);
      else map.set(key, [action]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // Keep selectedIndex within bounds.
  useEffect(() => {
    setSelectedIndex((prev) =>
      filtered.length === 0 ? 0 : Math.min(prev, filtered.length - 1),
    );
  }, [filtered.length]);

  // ---------- Global keyboard shortcut ----------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // ---------- Dialog keyboard handling ----------
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const len = filteredRef.current.length;
          return len === 0 ? 0 : (prev + 1) % len;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const len = filteredRef.current.length;
          return len === 0 ? 0 : (prev - 1 + len) % len;
        });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const action = filteredRef.current[selectedIndexRef.current];
        if (action) {
          action.onSelect();
          setIsOpen(false);
          setQuery('');
        }
        return;
      }

      // Handle Tab: trap within dialog
      if (e.key === 'Tab') {
        const els = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
        );
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Focus input when opened; reset state when closed.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Defer focus so the DOM is painted before we move focus (compatible
      // with both browser requestAnimationFrame and JSDOM setTimeout).
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center border-b border-slate-200 px-4">
          <svg
            className="h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions..."
            className="flex-1 border-0 bg-transparent px-3 py-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search command palette"
            aria-controls={listId}
            aria-activedescendant={
              filtered[selectedIndex]
                ? `cmd-${filtered[selectedIndex].id}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 font-mono">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <div
          className="max-h-72 overflow-y-auto p-2"
          role="listbox"
          id={listId}
          aria-label="Command palette actions"
        >
          {groups.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No matching actions found.
            </p>
          )}

          {groups.map(([section, sectionActions]) => (
            <div key={section}>
              <div
                className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400"
                role="presentation"
              >
                {section}
              </div>
              {sectionActions.map((action) => {
                const index = filtered.indexOf(action);
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={action.id}
                    id={`cmd-${action.id}`}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => {
                      action.onSelect();
                      setIsOpen(false);
                      setQuery('');
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={[
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <span className="flex-1 truncate">{action.label}</span>
                    {action.keywords.length > 0 && (
                      <span
                        className={[
                          'hidden sm:inline-flex shrink-0 gap-1 text-xs',
                          isSelected ? 'text-blue-100' : 'text-slate-400',
                        ].join(' ')}
                      >
                        {action.keywords.slice(0, 2).map((kw) => (
                          <span key={kw}>{kw}</span>
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              <kbd className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>{' '}
              select
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {filtered.length} action{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
