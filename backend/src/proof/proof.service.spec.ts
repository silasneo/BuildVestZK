import { ProofService } from './proof.service';

describe('ProofService', () => {
  it('should generate a sha256 proof hash and mark verified', async () => {
    const service = new ProofService();

    const result = await service.generateAndVerify([1500, 2300, 1800], 1000);

    expect(result.verified).toBe(true);
    expect(result.proofHash).toHaveLength(64);
  });
});
