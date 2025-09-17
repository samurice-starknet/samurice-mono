import { Module } from '@nestjs/common';
import { AISenseiController } from './ai-sensei.controller';
import { AISenseiService } from './ai-sensei.service';

@Module({
  imports: [],
  controllers: [AISenseiController],
  providers: [AISenseiService],
})
export class AISenseiModule {}
