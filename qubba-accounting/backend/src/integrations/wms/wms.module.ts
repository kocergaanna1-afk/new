import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// This module will contain integration with Qubba WMS system
// - Sync purchase documents
// - Sync products/inventory
// - Sync counterparties
// - Webhook handlers

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [],
  exports: [],
})
export class WmsModule {}
