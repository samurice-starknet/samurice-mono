import { Module } from '@nestjs/common';
import { PlayerModule } from './players/players.module';
import configSystem from '@app/shared/config/config-system';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GameModule } from './game/game.module';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchMakingQueue } from '@app/shared/models/entity/match-making-queue.entity';
import { GameMatch } from '@app/shared/models/entity/game-match.entity';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: configSystem().JWT_SECRET,
      signOptions: {
        expiresIn: '1d',
      },
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [MatchMakingQueue, GameMatch],
      synchronize: true,
    }),
    ConfigModule.forRoot(),
    MongooseModule.forRoot(configSystem().MONGODB_URI),
    PlayerModule,
    GameModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
