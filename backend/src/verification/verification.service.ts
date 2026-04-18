import { Injectable, Logger } from '@nestjs/common';
import { LocalVerifier } from './local.verifier';
import { SorobanVerifier } from './soroban.verifier';
import type { VerificationResult } from './verification.interface';

/**
 * Verification service with toggle between local and on-chain modes.
 *
 * Reads VERIFICATION_MODE from env (default: "local").
 * When set to "onchain", attempts Soroban contract verification first and
 * falls back to local verification on failure.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly localVerifier: LocalVerifier,
    private readonly sorobanVerifier: SorobanVerifier,
  ) {}

  async verify(
    proofHash: string,
    publicInputs: string[],
  ): Promise<VerificationResult> {
    const mode = (process.env.VERIFICATION_MODE || 'local').toLowerCase();

    if (mode === 'onchain') {
      try {
        this.logger.log('Attempting on-chain Soroban verification');
        return await this.sorobanVerifier.verify(proofHash, publicInputs);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `On-chain verification failed, falling back to local: ${message}`,
        );
        return this.localVerifier.verify(proofHash, publicInputs);
      }
    }

    return this.localVerifier.verify(proofHash, publicInputs);
  }
}
