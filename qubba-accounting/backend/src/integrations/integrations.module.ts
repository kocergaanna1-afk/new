import { Module } from '@nestjs/common';
import { MarketplacesModule } from './marketplaces/marketplaces.module';
import { WmsModule } from './wms/wms.module';

@Module({
  imports: [MarketplacesModule, WmsModule],
  exports: [MarketplacesModule, WmsModule],
})
export class IntegrationsModule {}
