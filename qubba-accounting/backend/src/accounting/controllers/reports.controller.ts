import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostingService } from '../services/posting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly postingService: PostingService) {}

  // Оборотно-сальдовая ведомость
  @Get('trial-balance')
  async getTrialBalance(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    
    const data = await this.postingService.getTrialBalance(
      from,
      to,
      user.organizationId,
    );

    // Calculate totals
    const totals = data.reduce(
      (acc, row) => ({
        openingDebit: acc.openingDebit + row.openingDebit,
        openingCredit: acc.openingCredit + row.openingCredit,
        turnoverDebit: acc.turnoverDebit + row.turnoverDebit,
        turnoverCredit: acc.turnoverCredit + row.turnoverCredit,
        closingDebit: acc.closingDebit + row.closingDebit,
        closingCredit: acc.closingCredit + row.closingCredit,
      }),
      {
        openingDebit: 0,
        openingCredit: 0,
        turnoverDebit: 0,
        turnoverCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      },
    );

    return {
      period: { from, to },
      data,
      totals,
    };
  }

  // Карточка счёта
  @Get('account-card')
  async getAccountCard(
    @Query('accountCode') accountCode: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.getAccountCard(
      accountCode,
      new Date(dateFrom),
      new Date(dateTo),
      user.organizationId,
    );
  }
}
