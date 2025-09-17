import { Module } from '@nestjs/common';
import { AgentModule } from './agents/agent.module';

@Module({
  imports: [AgentModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
