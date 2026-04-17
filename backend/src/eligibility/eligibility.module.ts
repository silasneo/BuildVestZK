import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProofModule } from '../proof/proof.module';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';
import { TierRulesEngine } from './tier-rules.engine';

@Module({
  imports: [AuthModule, ProofModule],
  controllers: [EligibilityController],
  providers: [EligibilityService, TierRulesEngine],
})
export class EligibilityModule {}
