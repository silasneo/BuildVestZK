import { Module } from '@nestjs/common';
import { LocalVerifier } from './local.verifier';
import { SorobanVerifier } from './soroban.verifier';
import { VerificationService } from './verification.service';

@Module({
  providers: [LocalVerifier, SorobanVerifier, VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
