import { EligibilityService } from './eligibility.service';

describe('EligibilityService', () => {
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

  let service: EligibilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EligibilityService(
      prisma as never,
      tierRulesEngine as never,
      zkService as never,
      stellarService as never,
    );
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

    const result = await service.evaluate(
      1,
      'user@example.com',
      [1500, 2300, 1800],
    );

    expect(result.verificationMethod).toBe('noir');
    expect(result.proofHash).toBe('proof-hash');
    expect(result.stellarTxHash).toBe('stellar-tx-hash');
    expect(result.stellarLedger).toBe(12345);
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
  });

  it('returns null stellar fields when Stellar submission fails', async () => {
    tierRulesEngine.evaluate.mockReturnValue(true);
    zkService.generateAndVerify.mockResolvedValue({
      proofHash: 'proof-hash',
      verificationMethod: 'mock',
    });
    stellarService.submitProofHash.mockResolvedValue(null);

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
});
