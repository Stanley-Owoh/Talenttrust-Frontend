import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DOC_PATH = path.resolve(REPO_ROOT, 'docs', 'components', 'MilestonesApi.md');
const README_PATH = path.resolve(REPO_ROOT, 'docs', 'README.md');

const COMPONENTS = [
  'MilestonesList',
  'MilestoneRow',
  'MilestoneFilter',
  'MilestoneCreationForm',
] as const;

const SOURCE_PATHS: Record<(typeof COMPONENTS)[number], string> = {
  MilestonesList: 'src/components/MilestonesList.tsx',
  MilestoneRow: 'src/components/milestones/MilestoneRow.tsx',
  MilestoneFilter: 'src/components/milestones/MilestoneFilter.tsx',
  MilestoneCreationForm: 'src/components/milestones/MilestoneCreationForm.tsx',
};

describe('Milestones API reference docs', () => {
  const markdown = readFileSync(DOC_PATH, 'utf8');

  it('exists', () => {
    expect(existsSync(DOC_PATH)).toBe(true);
  });

  it('opens with the Milestones Component API Reference title', () => {
    expect(markdown.startsWith('# Milestones Component API Reference')).toBe(true);
  });

  it.each(COMPONENTS)('has a prop-table section for %s', (component) => {
    const section = new RegExp('#{2,3}[^\\n]*`' + component + '`[\\s\\S]{0,500}?\\|\\s*---');
    expect(markdown).toMatch(section);
  });

  it.each(COMPONENTS)('references the %s source path and that file exists', (component) => {
    const sourcePath = SOURCE_PATHS[component];
    expect(markdown).toContain(sourcePath);
    expect(existsSync(path.resolve(REPO_ROOT, sourcePath))).toBe(true);
  });

  it('includes a minimal usage example for the milestone components', () => {
    expect(markdown).toContain('<MilestonesList');
    expect(markdown).toContain('<MilestoneFilter');
    expect(markdown).toContain('<MilestoneCreationForm');
  });
});

describe('docs index links to the Milestones API reference', () => {
  const readme = readFileSync(README_PATH, 'utf8');

  it('lists docs/components/MilestonesApi.md', () => {
    expect(readme).toContain('./components/MilestonesApi.md');
  });
});
