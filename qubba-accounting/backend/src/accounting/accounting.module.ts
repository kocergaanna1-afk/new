import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, AnalyticsType, Posting, JournalEntry } from '../database/entities';
import { AccountService } from './services/account.service';
import { PostingService } from './services/posting.service';
import { AccountController } from './controllers/account.controller';
import { PostingController } from './controllers/posting.controller';
import { ReportsController } from './controllers/reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, AnalyticsType, Posting, JournalEntry]),
  ],
  controllers: [AccountController, PostingController, ReportsController],
  providers: [AccountService, PostingService],
  exports: [AccountService, PostingService],
})
export class AccountingModule {}
