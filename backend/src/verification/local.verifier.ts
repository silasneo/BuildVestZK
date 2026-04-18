import { Injectable, Logger } from '@nestjs/common';
import type { VerificationResult } from './verification.interface';

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verify(proofHash: string, publicInputs: string[]): VerificationResult {
    this.logger.log('Verifying proof locally (Barretenberg / mock)');
    return {
      verified: true,
      verificationMethod: 'noir',
    };
  }
}
