import { Injectable } from '@nestjs/common';

@Injectable()
export class StellarService {
  async anchorProof(
    _userId: number,
    _proofHash: string,
  ): Promise<{ txHash: string; accountId: string } | null> {
    return null;
  }
}
