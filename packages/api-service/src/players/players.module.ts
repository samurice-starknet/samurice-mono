import { Module } from '@nestjs/common';
import { PlayerController } from './players.controller';
import { PlayersService } from './players.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Players, PlayerSchema } from '@app/shared/models/schema/player.schema';
import { Web3Service } from '@app/shared/web3.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Players.name,
        schema: PlayerSchema,
      },
    ]),
  ],
  providers: [PlayersService, JwtService, Web3Service],
  controllers: [PlayerController],
})
export class PlayerModule {}
