import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';

import { ValidationPipe } from '@nestjs/common';

import * as bodyParser from 'body-parser';
import configSystem from '@app/shared/config/config-system';
import { configureSwagger } from '@app/shared/config/config-swagger';
import { configureValidation } from '@app/shared/config/config-validation';
import { configureCors } from '@app/shared/config/config-cors';
import { whitelistPage } from '@app/shared/utils/constants';

mongoose.set('debug', true);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = configSystem().API_PORT;

  app.enableCors(configureCors(whitelistPage));

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
  configureSwagger(app);
  configureValidation(app);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(port, () => {
    console.log(
      `AI Service is running on port ${port} | Doc Run on http://localhost:${port}/docs`,
    );
  });
}
bootstrap();
