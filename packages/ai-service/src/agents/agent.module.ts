import { Module } from '@nestjs/common';
import { AIDealerModule } from './ai-dealer/ai-dealer.module';
import { AISenseiModule } from './ai-sensei/ai-sensei.module';
import { AIEnemyModule } from './ai-enemy/ai-enemy.module';

@Module({
  imports: [AIDealerModule, AISenseiModule, AIEnemyModule],
  controllers: [],
  providers: [],
})
export class AgentModule {}
