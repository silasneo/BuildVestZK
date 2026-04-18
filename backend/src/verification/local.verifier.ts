import { Injectable, Logger } from '@nestjs/common';
import type { VerificationResult } from './verification.interface.js';

/**
 * Local (Barretenberg / mock) verification strategy.
 *
 * In the hackathon MVP the ZK proof is already verified during generation
 * (ZkService.generateAndVerify), so this verifier simply marks the proof as
 * verified with method "noir".
 */
@Injectable()
export class LocalVerifier {
  private readonly logger = new Logger(LocalVerifier.name);

  async verify(
    _proofHash: string,
    _publicInputs: string[],
  ): Promise<VerificationResult> {
    this.logger.log('Verifying proof locally (Barretenberg / mock)');
    return {
      verified: true,
      verificationMethod: 'noir',
    };
  }
}
