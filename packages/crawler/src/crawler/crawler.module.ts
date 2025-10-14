import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SyncStatus,
  SyncStatusSchema,
} from '@app/shared/models/schema/sync-status.schema';
import { Web3Service } from '@app/shared/web3.service';
import { Players, PlayerSchema } from '@app/shared/models/schema/player.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SyncStatus.name, schema: SyncStatusSchema },
      { name: Players.name, schema: PlayerSchema },
    ]),
  ],
  providers: [CrawlerService, Web3Service],
})
export class CrawlerModule {}
