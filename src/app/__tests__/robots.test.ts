import robots from '../robots';

describe('robots.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default localhost URL when no NEXT_PUBLIC_SITE_URL is set', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const result = robots();

    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
    });
  });

  it('should use provided NEXT_PUBLIC_SITE_URL when set', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    const result = robots();

    expect(result.sitemap).toBe('https://talenttrust.app/sitemap.xml');
  });
});
