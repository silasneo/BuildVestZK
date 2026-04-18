import { LocalVerifier } from './local.verifier';
import { SorobanVerifier } from './soroban.verifier';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  const originalEnv = process.env;

  let localVerifier: LocalVerifier;
  let sorobanVerifier: SorobanVerifier;
  let service: VerificationService;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };

    localVerifier = new LocalVerifier();
    sorobanVerifier = new SorobanVerifier();
    service = new VerificationService(localVerifier, sorobanVerifier);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to local verification when VERIFICATION_MODE is not set', async () => {
    delete process.env.VERIFICATION_MODE;

    const result = await service.verify('abc123', ['1000']);

    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('noir');
  });

  it('uses local verification when VERIFICATION_MODE=local', async () => {
    process.env.VERIFICATION_MODE = 'local';

    const result = await service.verify('abc123', ['1000']);

    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('noir');
  });

  it('attempts on-chain and falls back to local on failure', async () => {
    process.env.VERIFICATION_MODE = 'onchain';

    jest
      .spyOn(sorobanVerifier, 'verify')
      .mockRejectedValue(new Error('contract not deployed'));

    const localSpy = jest.spyOn(localVerifier, 'verify');

    const result = await service.verify('abc123', ['1000']);

    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('noir');
    expect(localSpy).toHaveBeenCalled();
  });

  it('returns on-chain result when Soroban verification succeeds', async () => {
    process.env.VERIFICATION_MODE = 'onchain';

    jest.spyOn(sorobanVerifier, 'verify').mockResolvedValue({
      verified: true,
      verificationMethod: 'onchain',
      sorobanTxHash: 'soroban-hash-123',
      sorobanExplorerUrl:
        'https://stellar.expert/explorer/testnet/tx/soroban-hash-123',
    });

    const result = await service.verify('abc123', ['1000']);

    expect(result.verified).toBe(true);
    expect(result.verificationMethod).toBe('onchain');
    expect(result.sorobanTxHash).toBe('soroban-hash-123');
    expect(result.sorobanExplorerUrl).toBe(
      'https://stellar.expert/explorer/testnet/tx/soroban-hash-123',
    );
  });

  it('is case-insensitive for VERIFICATION_MODE', async () => {
    process.env.VERIFICATION_MODE = 'ONCHAIN';

    jest.spyOn(sorobanVerifier, 'verify').mockRejectedValue(new Error('test'));

    const result = await service.verify('abc123', ['1000']);

    // Falls back to local
    expect(result.verificationMethod).toBe('noir');
  });
});
