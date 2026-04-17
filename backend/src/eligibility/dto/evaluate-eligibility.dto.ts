import { ArrayMaxSize, ArrayMinSize, IsArray, IsNumber } from 'class-validator';

export class EvaluateEligibilityDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsNumber({}, { each: true })
  monthBalances!: number[];
}
