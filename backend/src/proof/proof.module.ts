import { Module } from '@nestjs/common';
import { ProofService } from './proof.service';
import { StellarService } from './stellar.service';

@Module({
  providers: [ProofService, StellarService],
  exports: [ProofService, StellarService],
})
export class ProofModule {}
