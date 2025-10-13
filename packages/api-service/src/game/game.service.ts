import { GameMatch } from '@app/shared/models/entity/game-match.entity';
import { MatchMakingQueue } from '@app/shared/models/entity/match-making-queue.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Or } from 'typeorm';
import { WsException } from '@nestjs/websockets';
import { EGameStatus } from '@app/shared/utils/types';
import { Web3Service } from '@app/shared/web3.service';

@Injectable()
export class GameService {
  protected logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(MatchMakingQueue)
    private readonly matchMakingQueueRepository: Repository<MatchMakingQueue>,
    @InjectRepository(GameMatch)
    private readonly gameMatchRepository: Repository<GameMatch>,
    private readonly web3Service: Web3Service,
  ) {}

  async initSystem() {
    await this.matchMakingQueueRepository.save({
      id: '0.0.1',
      player: null,
    });
  }

  async startNewGame(
    player: string,
    gameId?: string,
  ): Promise<{ isMatchFound: boolean; gameId?: string }> {
    const matchMakingQueue = await this.matchMakingQueueRepository.findOneBy({
      id: '0.0.1',
    });

    if (!matchMakingQueue.player) {
      matchMakingQueue.player = player;
      await this.matchMakingQueueRepository.save(matchMakingQueue);
      return {
        isMatchFound: false,
      };
    }

    if (matchMakingQueue.player === player) {
      throw new WsException('Player already in queue');
    }

    matchMakingQueue.player = null;
    await this.matchMakingQueueRepository.save(matchMakingQueue);

    await this.gameMatchRepository.save({
      id: gameId,
      playerA: player,
      playerB: matchMakingQueue.player,
      status: EGameStatus.Proccesing,
    });

    return {
      isMatchFound: true,
      gameId: gameId,
    };
  }

  async handlDisconnect(player: string) {
    const matchMakingQueue = await this.matchMakingQueueRepository.findOneBy({
      id: '0.0.1',
    });

    if (
      typeof matchMakingQueue.player === 'string' &&
      matchMakingQueue.player === player
    ) {
      matchMakingQueue.player = null;
      await this.matchMakingQueueRepository.save(matchMakingQueue);

      await this.web3Service.popFrontQueue();
      return;
    }

    const gameMatch = await this.gameMatchRepository.findOne({
      where: [
        { playerA: player, status: EGameStatus.Proccesing },
        { playerB: player, status: EGameStatus.Proccesing },
      ],
    });

    if (!gameMatch) {
      return;
    }

    gameMatch.status = EGameStatus.Cancelled;
    await this.gameMatchRepository.save(gameMatch);
  }
}
