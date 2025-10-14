import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import configSystem from '@app/shared/config/config-system';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(configSystem().CRAWLER_PORT);
  console.log(`Crawler is running on port ${configSystem().CRAWLER_PORT}`);
}
bootstrap();
