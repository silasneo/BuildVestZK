import { Module } from '@nestjs/common';
import { ProofModule } from '../proof/proof.module';
import { ZkService } from './zk.service';

@Module({
  imports: [ProofModule],
  providers: [ZkService],
  exports: [ZkService],
})
export class ZkModule {}
