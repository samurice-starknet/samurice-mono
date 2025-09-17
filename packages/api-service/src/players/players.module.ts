import { Module } from '@nestjs/common';
import { PlayerController } from './players.controller';
import { PlayersService } from './players.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Players, PlayerSchema } from '@app/shared/models/schema/player.schema';
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Players.name,
        schema: PlayerSchema,
      },
    ]),
  ],
  providers: [PlayersService],
  controllers: [PlayerController],
})
export class PlayerModule {}
