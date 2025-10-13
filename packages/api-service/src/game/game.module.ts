import { Module } from '@nestjs/common';
import { GameSocketGateway } from './gamesocket.gateway';
import { PlayersService } from '../players/players.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Web3Service } from '@app/shared/web3.service';
import { Players, PlayerSchema } from '@app/shared/models/schema/player.schema';
import { GameService } from './game.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchMakingQueue } from '@app/shared/models/entity/match-making-queue.entity';
import { GameMatch } from '@app/shared/models/entity/game-match.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Players.name,
        schema: PlayerSchema,
      },
    ]),
    TypeOrmModule.forFeature([MatchMakingQueue, GameMatch]),
  ],
  providers: [
    GameSocketGateway,
    GameService,
    PlayersService,
    JwtService,
    Web3Service,
  ],
})
export class GameModule {}
