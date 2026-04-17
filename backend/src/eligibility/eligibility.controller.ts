import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { EvaluateEligibilityDto } from './dto/evaluate-eligibility.dto';
import { EligibilityService } from './eligibility.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller('eligibility')
@UseGuards(JwtAuthGuard)
export class EligibilityController {
  constructor(private readonly eligibilityService: EligibilityService) {}

  @Get('status')
  async getStatus(@Req() request: AuthenticatedRequest, @Res() response: Response): Promise<void> {
    const status = await this.eligibilityService.getStatus(request.user.userId);
    response.json(status);
  }

  @Post('evaluate')
  evaluate(@Req() request: AuthenticatedRequest, @Body() dto: EvaluateEligibilityDto) {
    return this.eligibilityService.evaluate(request.user.userId, dto.monthBalances);
  }
}
