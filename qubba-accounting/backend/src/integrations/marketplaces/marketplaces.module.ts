import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// This module will contain integrations with:
// - Wildberries
// - Ozon
// - Yandex.Market
// - AliExpress

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [],
  exports: [],
})
export class MarketplacesModule {}
