import { Module } from '@nestjs/common';
import { PlayerModule } from './players/players.module';
import configSystem from '@app/shared/config/config-system';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(configSystem().MONGODB_URI),
    PlayerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
