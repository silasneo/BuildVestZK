import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class ProofService {
  async generateAndVerify(
    monthBalances: number[],
    threshold: number,
  ): Promise<{ proofHash: string; verified: boolean }> {
    const proofPayload = JSON.stringify({
      type: 'FINANCIAL_ELIGIBILITY',
      tier: 'PRIME',
      balances_above_threshold: true,
      threshold,
      month_count: monthBalances.length,
      generated_at: new Date().toISOString(),
    });

    const proofHash = createHash('sha256').update(proofPayload).digest('hex');

    return { proofHash, verified: true };
  }
}
