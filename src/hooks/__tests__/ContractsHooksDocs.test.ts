/**
 * Documentation-accuracy tests for docs/hooks/ContractsHooks.md.
 *
 * These tests do not re-assert hook behaviour — `useContractProgress.test.ts`
 * and `useOptimisticContractStatus.test.ts` own that. Instead they pin the
 * *documentation* to the current source, so a renamed metric, a reworded error
 * string, or a changed signature fails here rather than silently rotting the
 * reference page.
 *
 * `describe`, `expect`, and `it` come from the configured jest environment,
 * matching the existing convention used by FormsApiDocs.test.ts and
 * MilestonesApiDocs.test.ts.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOC_PATH = path.resolve(REPO_ROOT, 'docs', 'hooks', 'ContractsHooks.md');
const DOCS_INDEX_PATH = path.resolve(REPO_ROOT, 'docs', 'README.md');

const CONTRACT_PROGRESS_SOURCE = 'src/hooks/useContractProgress.ts';
const OPTIMISTIC_STATUS_SOURCE = 'src/hooks/useOptimisticContractStatus.ts';

const markdown = readFileSync(DOC_PATH, 'utf8');
const contractProgressSource = readFileSync(
  path.resolve(REPO_ROOT, CONTRACT_PROGRESS_SOURCE),
  'utf8',
);
const optimisticStatusSource = readFileSync(
  path.resolve(REPO_ROOT, OPTIMISTIC_STATUS_SOURCE),
  'utf8',
);

/** Hooks that must each own a documented section. */
const HOOKS = ['useContractProgress', 'useOptimisticContractStatus'] as const;

const SOURCE_PATHS: Record<(typeof HOOKS)[number], string> = {
  useContractProgress: CONTRACT_PROGRESS_SOURCE,
  useOptimisticContractStatus: OPTIMISTIC_STATUS_SOURCE,
};

/**
 * Extracts every property name declared in an exported interface/type block,
 * so the doc can be checked against the real shape instead of a hard-coded
 * duplicate of it.
 */
function extractInterfaceKeys(source: string, blockName: string): string[] {
  const block = new RegExp(
    `(?:interface|type)\\s+${blockName}\\s*(?:=\\s*)?\\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);

  if (!block) {
    throw new Error(`Could not locate the "${blockName}" declaration in the source.`);
  }

  return Array.from(block[1].matchAll(/^\s{2}(\w+)\??:/gm)).map((match) => match[1]);
}

/** Extracts every single-quoted string literal that reads as user-facing copy. */
function extractUserFacingMessages(source: string): string[] {
  return Array.from(source.matchAll(/'([A-Z][^']{30,})'/g)).map((match) => match[1]);
}

describe('docs/hooks/ContractsHooks.md — file and index wiring', () => {
  it('exists on disk', () => {
    expect(existsSync(DOC_PATH)).toBe(true);
  });

  it('opens with the Contracts Hooks title', () => {
    expect(markdown.startsWith('# Contracts Hooks')).toBe(true);
  });

  it('is linked from the docs index under the Hooks table', () => {
    const index = readFileSync(DOCS_INDEX_PATH, 'utf8');
    expect(index).toContain('./hooks/ContractsHooks.md');
  });

  it('is linked from the docs index with a description of what it covers', () => {
    const index = readFileSync(DOCS_INDEX_PATH, 'utf8');
    const row = index
      .split('\n')
      .find((line) => line.includes('./hooks/ContractsHooks.md'));

    expect(row).toBeDefined();
    expect(row).toContain('useContractProgress');
    expect(row).toContain('useOptimisticContractStatus');
  });

  it('does not contain unresolved merge-conflict markers', () => {
    expect(markdown).not.toMatch(/^(<{7}|={7}|>{7})/m);
  });
});

describe('docs/hooks/ContractsHooks.md — per-hook sections', () => {
  it.each(HOOKS)('has a level-2 section for `%s`', (hook) => {
    expect(markdown).toMatch(new RegExp(`^## \`${hook}\``, 'm'));
  });

  it.each(HOOKS)('documents inputs, returns, and states for `%s`', (hook) => {
    // Slice out just this hook's section so the assertions cannot be satisfied
    // by a heading that belongs to the other hook.
    const start = markdown.indexOf(`## \`${hook}\``);
    expect(start).toBeGreaterThan(-1);

    const rest = markdown.slice(start + 1);
    const nextSection = rest.indexOf('\n## ');
    const section = nextSection === -1 ? rest : rest.slice(0, nextSection);

    expect(section).toMatch(/### Inputs/);
    expect(section).toMatch(/### Returns/);
    expect(section).toMatch(/### States/);
    // Every section must carry at least one fenced code example.
    expect(section).toMatch(/```tsx?[\s\S]*?```/);
  });

  it.each(HOOKS)('references the `%s` source path, and that file exists', (hook) => {
    const sourcePath = SOURCE_PATHS[hook];
    expect(markdown).toContain(sourcePath);
    expect(existsSync(path.resolve(REPO_ROOT, sourcePath))).toBe(true);
  });

  it.each(HOOKS)('shows an import statement for `%s`', (hook) => {
    expect(markdown).toContain(`import {\n  ${hook},`);
  });
});

describe('docs/hooks/ContractsHooks.md — accuracy against useContractProgress', () => {
  const metricKeys = extractInterfaceKeys(
    contractProgressSource,
    'ContractProgressMetrics',
  );

  it('reads all six metric keys from the source (guards the extractor itself)', () => {
    expect(metricKeys).toEqual([
      'completedCount',
      'totalCount',
      'paidAmount',
      'outstandingAmount',
      'progressPercent',
      'currency',
    ]);
  });

  it.each(
    extractInterfaceKeys(contractProgressSource, 'ContractProgressMetrics'),
  )('documents the `%s` metric', (key) => {
    expect(markdown).toContain(`\`${key}\``);
  });

  it('documents the exported hook and the pure helper', () => {
    expect(contractProgressSource).toContain('export function useContractProgress');
    expect(contractProgressSource).toContain('export function calculateContractProgress');
    expect(markdown).toContain('useContractProgress(milestones: Milestone[]): ContractProgressMetrics');
    expect(markdown).toContain('calculateContractProgress');
  });

  it('documents the USD fallback that the source actually implements', () => {
    expect(contractProgressSource).toContain("currency: 'USD'");
    expect(markdown).toContain("`'USD'`");
  });

  it('documents the completed statuses the source checks for', () => {
    expect(contractProgressSource).toContain("milestone.status === 'Completed'");
    expect(contractProgressSource).toContain("milestone.status === 'Paid'");
    expect(markdown).toContain("`'Completed'`");
    expect(markdown).toContain("`'Paid'`");
  });

  it('documents the rounding rule used for progressPercent', () => {
    expect(contractProgressSource).toContain(
      'Math.round((completedCount / totalCount) * 100)',
    );
    expect(markdown).toContain('Math.round((completedCount / totalCount) * 100)');
  });

  it('documents the useMemo reference-equality caveat', () => {
    expect(contractProgressSource).toContain('useMemo');
    expect(markdown).toMatch(/Memoization contract/);
    expect(markdown).toMatch(/array reference/i);
  });
});

describe('docs/hooks/ContractsHooks.md — accuracy against useOptimisticContractStatus', () => {
  const failureMessages = extractUserFacingMessages(optimisticStatusSource);

  it('finds the three failure messages in the source (guards the extractor itself)', () => {
    expect(failureMessages).toHaveLength(3);
  });

  it.each(extractUserFacingMessages(optimisticStatusSource))(
    'quotes the exact failure message: "%s"',
    (message) => {
      expect(markdown).toContain(message);
    },
  );

  it('documents the PersistResult union exactly as declared', () => {
    expect(optimisticStatusSource).toContain('ok: true');
    expect(optimisticStatusSource).toContain('ok: false; stale: boolean; error: string');
    expect(markdown).toContain('{ ok: true }');
    expect(markdown).toContain('{ ok: false; stale: boolean; error: string }');
  });

  it('documents the BuildPersistedContract signature with all three arguments', () => {
    expect(optimisticStatusSource).toContain('export type BuildPersistedContract');
    expect(markdown).toContain('type BuildPersistedContract');
    expect(markdown).toContain('data: ContractData');
    expect(markdown).toContain("status: ContractData['status']");
    expect(markdown).toContain('version: number');
  });

  it('documents that the version comes from getContractVersion by contract name', () => {
    expect(optimisticStatusSource).toContain('getContractVersion(contractData.name)');
    expect(markdown).toContain('getContractVersion(contractData.name)');
  });

  it('documents the upsertContract write path', () => {
    expect(optimisticStatusSource).toContain('upsertContract(persisted)');
    expect(markdown).toContain('upsertContract');
  });

  it('documents the null-contract short circuit', () => {
    expect(optimisticStatusSource).toContain('if (!contractData)');
    expect(markdown).toMatch(/\*\*Unavailable\*\*/);
    expect(markdown).toContain('contractData === null');
  });

  it('documents the rollback behaviour on a failed write', () => {
    expect(optimisticStatusSource).toContain('setContractData(rollbackRef.current)');
    expect(markdown).toMatch(/roll(s|ed)? back/i);
  });

  it('documents that the hook is synchronous and has no pending state', () => {
    // The source has no async/await and no promise returns — the doc must not
    // imply otherwise by promising a loading state.
    expect(optimisticStatusSource).not.toMatch(/\basync\b|\bawait\b/);
    expect(markdown).toMatch(/no in-flight\/pending state/i);
  });
});

describe('docs/hooks/ContractsHooks.md — cross-links', () => {
  const RELATIVE_LINKS: Array<[string, string]> = [
    ['./useCopyToClipboard.md', 'docs/hooks/useCopyToClipboard.md'],
    ['../components/Dialogs.md', 'docs/components/Dialogs.md'],
    ['../components/Toast.md', 'docs/components/Toast.md'],
    ['../components/Preferences.md', 'docs/components/Preferences.md'],
    ['../contracts-data-flow.md', 'docs/contracts-data-flow.md'],
  ];

  it.each(RELATIVE_LINKS)('links to %s, which resolves to a real file', (link, resolved) => {
    expect(markdown).toContain(link);
    expect(existsSync(path.resolve(REPO_ROOT, resolved))).toBe(true);
  });

  it('names the test files that cover each documented hook', () => {
    expect(markdown).toContain('src/hooks/__tests__/useContractProgress.test.ts');
    expect(markdown).toContain('src/hooks/__tests__/useOptimisticContractStatus.test.ts');
    expect(
      existsSync(
        path.resolve(REPO_ROOT, 'src/hooks/__tests__/useContractProgress.test.ts'),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.resolve(
          REPO_ROOT,
          'src/hooks/__tests__/useOptimisticContractStatus.test.ts',
        ),
      ),
    ).toBe(true);
  });
});
