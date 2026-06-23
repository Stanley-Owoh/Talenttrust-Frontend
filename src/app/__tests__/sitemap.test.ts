import sitemap from '../sitemap';

describe('sitemap.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Freeze time for consistent lastModified testing
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('should generate sitemap with all public static routes', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const result = sitemap();

    expect(result).toHaveLength(4);
    expect(result.map(entry => entry.url)).toEqual([
      'http://localhost:3000',
      'http://localhost:3000/contracts',
      'http://localhost:3000/milestones',
      'http://localhost:3000/reputation',
    ]);

    result.forEach(entry => {
      expect(entry.lastModified).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });
  });

  it('should use custom NEXT_PUBLIC_SITE_URL when provided', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    const result = sitemap();

    expect(result[0].url).toBe('https://talenttrust.app');
    expect(result[1].url).toBe('https://talenttrust.app/contracts');
  });
});
