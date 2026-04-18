import { Keypair } from '@stellar/stellar-sdk';
import { StellarService } from './stellar.service';

describe('StellarService', () => {
  const originalEnv = process.env;
  let service: StellarService;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    service = new StellarService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when STELLAR_SECRET_KEY is missing', async () => {
    delete process.env.STELLAR_SECRET_KEY;

    const fromSecretSpy = jest.spyOn(Keypair, 'fromSecret');
    const result = await service.submitProofHash(
      'proof-hash',
      'user@example.com',
    );

    expect(result).toBeNull();
    expect(fromSecretSpy).not.toHaveBeenCalled();
  });

  it('returns null when key parsing fails', async () => {
    process.env.STELLAR_SECRET_KEY = 'not-a-valid-secret';
    jest.spyOn(Keypair, 'fromSecret').mockImplementation(() => {
      throw new Error('invalid secret');
    });

    const result = await service.submitProofHash(
      'proof-hash',
      'user@example.com',
    );

    expect(result).toBeNull();
  });
});
