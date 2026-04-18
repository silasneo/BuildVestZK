import { ProofService } from '../proof/proof.service';
import { ZkService } from './zk.service';

describe('ZkService', () => {
  it('falls back to mock proof when noir proof generation fails', async () => {
    const service = new ZkService(new ProofService());

    const result = await service.generateAndVerify([1500, 2300, 1800], 1000);

    expect(result.verificationMethod).toBe('mock');
    expect(result.proofHash).toHaveLength(64);
    expect(result.warning).toContain('falling back to mock proof');
  });

  it('returns noir metadata when noir proof path succeeds', async () => {
    const service = new ZkService(new ProofService());
    jest
      .spyOn(
        service as unknown as { generateNoirProof: () => Promise<unknown> },
        'generateNoirProof',
      )
      .mockResolvedValue({
        proof: new Uint8Array([1, 2, 3]),
        publicInputs: { threshold: 1000 },
        proofHash: 'abc123',
        verified: true,
        verificationMethod: 'noir',
      });

    const result = await service.generateAndVerify([1500, 2300, 1800], 1000);

    expect(result.verificationMethod).toBe('noir');
    expect(result.proofHash).toBe('abc123');
  });
});
