import { SorobanVerifier } from './soroban.verifier';

describe('SorobanVerifier', () => {
  const originalEnv = process.env;
  let verifier: SorobanVerifier;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    verifier = new SorobanVerifier();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when SOROBAN_VERIFIER_CONTRACT_ID is not set', async () => {
    delete process.env.SOROBAN_VERIFIER_CONTRACT_ID;

    await expect(verifier.verify('a'.repeat(64), ['1000'])).rejects.toThrow(
      'SOROBAN_VERIFIER_CONTRACT_ID is not set',
    );
  });

  it('throws when STELLAR_SECRET_KEY is not set', async () => {
    process.env.SOROBAN_VERIFIER_CONTRACT_ID = 'CONTRACT123';
    delete process.env.STELLAR_SECRET_KEY;

    await expect(verifier.verify('a'.repeat(64), ['1000'])).rejects.toThrow(
      'STELLAR_SECRET_KEY is not set',
    );
  });
});
