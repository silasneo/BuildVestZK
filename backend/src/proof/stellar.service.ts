import { Injectable } from '@nestjs/common';

@Injectable()
export class StellarService {
  async anchorProof(
    userId: number,
    proofHash: string,
  ): Promise<{ txHash: string; accountId: string } | null> {
    void userId;
    void proofHash;
    return null;
  }
}
