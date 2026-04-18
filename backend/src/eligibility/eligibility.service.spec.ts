import { EligibilityService } from './eligibility.service';

describe('EligibilityService', () => {
  const originalEnv = process.env;

  const prisma = {
    $transaction: jest.fn().mockResolvedValue([]),
    user: { update: jest.fn().mockResolvedValue({}) },
    eligibilityProfile: { upsert: jest.fn().mockResolvedValue({}) },
  };

  const tierRulesEngine = {
    evaluate: jest.fn(),
  };

  const zkService = {
    generateAndVerify: jest.fn(),
  };

  const stellarService = {
    submitProofHash: jest.fn(),
  };

  const verificationService = {
    verify: jest.fn(),
  };

  let service: EligibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    service = new EligibilityService(
      prisma as never,
      tierRulesEngine as never,
      zkService as never,
      stellarService as never,
      verificationService as never,
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not generate a proof when investor is not qualified', async () => {
    tierRulesEngine.evaluate.mockReturnValue(false);

    const result = await service.evaluate(
      1,
      'user@example.com',
      [800, 1200, 500],
    );

    expect(result).toEqual({ qualified: false, tier: 'RETAIL' });
    expect(zkService.generateAndVerify).not.toHaveBeenCalled();
    expect(verificationService.verify).not.toHaveBeenCalled();
  });

  it('uses noir verification method when zk proof generation succeeds', async () => {
    tierRulesEngine.evaluate.mockReturnValue(true);
    zkService.generateAndVerify.mockResolvedValue({
      proofHash: 'proof-hash',
      verificationMethod: 'noir',
    });
    stellarService.submitProofHash.mockResolvedValue({
      txHash: 'stellar-tx-hash',
      ledger: 12345,
    });
    verificationService.verify.mockResolvedValue({
      verified: true,
      verificationMethod: 'noir',
    });

    const result = await service.evaluate(
      1,
      'user@example.com',
      [1500, 2300, 1800],
    );

    expect(result.verificationMethod).toBe('noir');
    expect(result.proofHash).toBe('proof-hash');
    expect(result.stellarTxHash).toBe('stellar-tx-hash');
    expect(result.stellarLedger).toBe(12345);
    expect(result.sorobanTxHash).toBeNull();
    expect(result.stellarExplorerUrl).toBe(
      'https://stellar.expert/explorer/testnet/tx/stellar-tx-hash',
    );
    expect(result.horizonUrl).toBe(
      'https://horizon-testnet.stellar.org/transactions/stellar-tx-hash',
    );
    expect(zkService.generateAndVerify).toHaveBeenCalledWith(
      [1500, 2300, 1800],
      1000,
    );
    expect(stellarService.submitProofHash).toHaveBeenCalledWith(
      'proof-hash',
      'user@example.com',
    );
    expect(verificationService.verify).toHaveBeenCalledWith('proof-hash', [
      '1000',
    ]);
  });

  it('returns null stellar fields when Stellar submission fails', async () => {
    tierRulesEngine.evaluate.mockReturnValue(true);
    zkService.generateAndVerify.mockResolvedValue({
      proofHash: 'proof-hash',
      verificationMethod: 'mock',
    });
    stellarService.submitProofHash.mockResolvedValue(null);
    verificationService.verify.mockResolvedValue({
      verified: true,
      verificationMethod: 'noir',
    });

    const result = await service.evaluate(
      1,
      'user@example.com',
      [1500, 2300, 1800],
    );

    expect(result.stellarTxHash).toBeNull();
    expect(result.stellarLedger).toBeNull();
    expect(result.stellarExplorerUrl).toBeNull();
    expect(result.horizonUrl).toBeNull();
  });

  it('returns public network explorer links when STELLAR_NETWORK is public', async () => {
    process.env.STELLAR_NETWORK = 'public';
    tierRulesEngine.evaluate.mockReturnValue(true);
    zkService.generateAndVerify.mockResolvedValue({
      proofHash: 'proof-hash',
      verificationMethod: 'noir',
    });
    stellarService.submitProofHash.mockResolvedValue({
      txHash: 'stellar-tx-hash',
      ledger: 12345,
    });
    verificationService.verify.mockResolvedValue({
      verified: true,
      verificationMethod: 'noir',
    });

    const result = await service.evaluate(
      1,
      'user@example.com',
      [1500, 2300, 1800],
    );

    expect(result.stellarExplorerUrl).toBe(
      'https://stellar.expert/explorer/public/tx/stellar-tx-hash',
    );
    expect(result.horizonUrl).toBe(
      'https://horizon.stellar.org/transactions/stellar-tx-hash',
    );
  });

  it('includes Soroban metadata when verification is on-chain', async () => {
    tierRulesEngine.evaluate.mockReturnValue(true);
    zkService.generateAndVerify.mockResolvedValue({
      proofHash: 'proof-hash',
      verificationMethod: 'noir',
    });
    stellarService.submitProofHash.mockResolvedValue({
      txHash: 'stellar-tx-hash',
      ledger: 12345,
    });
    verificationService.verify.mockResolvedValue({
      verified: true,
      verificationMethod: 'onchain',
      sorobanTxHash: 'soroban-tx-hash',
      sorobanExplorerUrl:
        'https://stellar.expert/explorer/testnet/tx/soroban-tx-hash',
    });

    const result = await service.evaluate(
      1,
      'user@example.com',
      [1500, 2300, 1800],
    );

    expect(result.verificationMethod).toBe('onchain');
    expect(result.sorobanTxHash).toBe('soroban-tx-hash');
    expect(result.sorobanExplorerUrl).toBe(
      'https://stellar.expert/explorer/testnet/tx/soroban-tx-hash',
    );
  });
});
