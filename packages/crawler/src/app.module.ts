import { Module } from '@nestjs/common';
import { CrawlerModule } from './crawler/crawler.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import configSystem from '@app/shared/config/config-system';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(configSystem().MONGODB_URI),
    CrawlerModule,
  ],
  providers: [],
})
export class AppModule {}
