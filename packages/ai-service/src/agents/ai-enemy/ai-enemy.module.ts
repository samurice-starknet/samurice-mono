import { Module } from '@nestjs/common';
import { AIEnemyController } from './ai-enemy.controller';
import { AIEnemyService } from './ai-enemy.service';

@Module({
  imports: [],
  controllers: [AIEnemyController],
  providers: [AIEnemyService],
})
export class AIEnemyModule {}
