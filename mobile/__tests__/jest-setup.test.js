/**
 * Simple smoke test to verify Jest is configured correctly
 */

describe('Jest Configuration', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to globals', () => {
    expect(__DEV__).toBe(true);
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});
