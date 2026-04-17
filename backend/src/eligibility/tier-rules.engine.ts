import { Injectable } from '@nestjs/common';

@Injectable()
export class TierRulesEngine {
  private readonly threshold = 1000;

  evaluate(monthBalances: number[]): boolean {
    if (monthBalances.length !== 3) {
      return false;
    }

    return monthBalances.every((balance) => balance > this.threshold);
  }
}
