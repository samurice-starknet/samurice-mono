import { Module } from '@nestjs/common';

import { AIDealerController } from './ai-dealer.controller';
import { AIDealerService } from './ai-dealer.service';

@Module({
  imports: [],
  controllers: [AIDealerController],
  providers: [AIDealerService],
})
export class AIDealerModule {}
