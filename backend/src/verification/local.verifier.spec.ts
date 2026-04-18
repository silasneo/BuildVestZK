import { LocalVerifier } from './local.verifier';

describe('LocalVerifier', () => {
  let verifier: LocalVerifier;

  beforeEach(() => {
    verifier = new LocalVerifier();
  });

  it('returns verified=true with verificationMethod "noir"', () => {
    const result = verifier.verify('abc123', ['1000']);

    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('noir');
    expect(result.sorobanTxHash).toBeUndefined();
    expect(result.sorobanExplorerUrl).toBeUndefined();
  });
});
