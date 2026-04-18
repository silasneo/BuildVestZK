import { Module } from '@nestjs/common';
import { LocalVerifier } from './local.verifier.js';
import { SorobanVerifier } from './soroban.verifier.js';
import { VerificationService } from './verification.service.js';

@Module({
  providers: [LocalVerifier, SorobanVerifier, VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
