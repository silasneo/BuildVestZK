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
    anchorProof: jest.fn(),
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

    const result = await service.evaluate(1, [800, 1200, 500]);

    expect(result).toEqual({ qualified: false, tier: 'RETAIL' });
    expect(zkService.generateAndVerify).not.toHaveBeenCalled();
  });

  it('uses noir verification method when zk proof generation succeeds', async () => {
    tierRulesEngine.evaluate.mockReturnValue(true);
    zkService.generateAndVerify.mockResolvedValue({
      proofHash: 'proof-hash',
      verificationMethod: 'noir',
    });
    stellarService.anchorProof.mockResolvedValue(null);

    const result = await service.evaluate(1, [1500, 2300, 1800]);

    expect(result.verificationMethod).toBe('noir');
    expect(result.proofHash).toBe('proof-hash');
    expect(zkService.generateAndVerify).toHaveBeenCalledWith(
      [1500, 2300, 1800],
      1000,
    );
  });
});
