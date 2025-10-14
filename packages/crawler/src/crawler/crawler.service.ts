import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  SyncStatus,
  SyncStatusDocument,
} from '@app/shared/models/schema/sync-status.schema';
import configSystem from '@app/shared/config/config-system';
import { Web3Service } from '@app/shared/web3.service';
import { hash, num } from 'starknet';
import { EEventClashHash, TEventGameFinished } from '@app/shared/utils/types';
import {
  Players,
  PlayersDocument,
} from '@app/shared/models/schema/player.schema';
import { formattedContractAddress } from '@app/shared/utils/formatAddress';

@Injectable()
export class CrawlerService {
  protected logger = new Logger(CrawlerService.name);

  private readonly BLOCK_CHUNK = 10;
  isRunning = false;

  constructor(
    @InjectModel(SyncStatus.name)
    private readonly syncStatusModel: Model<SyncStatusDocument>,
    @InjectModel(Players.name)
    private readonly playerModel: Model<PlayersDocument>,
    private readonly web3Service: Web3Service,
  ) {}

  private async getStartBlock() {
    const lastBlock = await this.syncStatusModel.findOne();

    if (
      lastBlock !== null &&
      typeof lastBlock === 'object' &&
      Number.isInteger(lastBlock.lastBlock)
    ) {
      return lastBlock.lastBlock;
    }

    return configSystem().START_BLOCK;
  }

  private async getEventList(
    startBlock: number,
    endBlock: number,
  ): Promise<TEventGameFinished[]> {
    const provider = this.web3Service.getProvider();

    // Filter event by event EventEmitted and GameStart hash as a key
    const keyFilter = [
      [num.toHex(hash.starknetKeccak('EventEmitted'))],
      [EEventClashHash.GameStart],
    ];

    const eventsList = await provider.getEvents({
      address: configSystem().CONTRACT_ADDRESSES.WORLD,
      from_block: { block_number: startBlock },
      to_block: { block_number: startBlock + this.BLOCK_CHUNK },
      keys: keyFilter,
      chunk_size: 1000,
    });

    return eventsList.events.map((event) => {
      return {
        gameId: event.data[1],
        winner: formattedContractAddress(event.data[3]),
        loser: formattedContractAddress(event.data[5]),
      };
    });
  }

  private async updateLastBlock(blockNumber: number) {
    await this.syncStatusModel.updateOne(
      {},
      { $set: { lastBlock: blockNumber } },
      { upsert: true },
    );
  }

  private async updatePlayerPoint(gameRecord: TEventGameFinished) {
    await this.playerModel.findOneAndUpdate(
      {
        address: gameRecord.winner,
      },
      { set: { $inc: { point: 1 } }, $setOnInsert: { point: 1 } },
      { new: true, upsert: true },
    );

    const loserDocument = await this.playerModel.findOne({
      address: gameRecord.loser,
    });

    if (!loserDocument) {
      await this.playerModel.create({
        address: gameRecord.loser,
        username: gameRecord.loser,
      });
    } else {
      loserDocument.point =
        loserDocument.point === 0 ? 0 : loserDocument.point - 1;
      await loserDocument.save();
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async process() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      // get start block
      let startBlock = await this.getStartBlock();
      this.logger.debug(`Crawler start from block ${startBlock}`);

      const eventFinishGameList = await this.getEventList(
        startBlock,
        startBlock + this.BLOCK_CHUNK,
      );

      if (eventFinishGameList.length > 0) {
        this.logger.log(`Found ${eventFinishGameList.length} finished games`);
        // Update player points
        for (let i = 0; i < eventFinishGameList.length; i++) {
          const gameRecord = eventFinishGameList[i];
          await this.updatePlayerPoint(gameRecord);
        }
      }

      startBlock += this.BLOCK_CHUNK + 1;
      await this.updateLastBlock(startBlock);
    } catch (error) {
      this.logger.error('Error:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
