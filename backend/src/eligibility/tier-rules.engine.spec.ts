import { TierRulesEngine } from './tier-rules.engine';

describe('TierRulesEngine', () => {
  const engine = new TierRulesEngine();

  it('should return true when all balances are above threshold', () => {
    expect(engine.evaluate([1200, 1500, 1800])).toBe(true);
  });

  it('should return false when any balance is not above threshold', () => {
    expect(engine.evaluate([1200, 800, 1500])).toBe(false);
  });

  it('should return false when the number of months is not exactly three', () => {
    expect(engine.evaluate([1200, 1300])).toBe(false);
  });
});
