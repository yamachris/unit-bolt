import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // just to seach quickly https://www.unitcardgame.com
  // Enable CORS with improved preflight handling
  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? '3007', 10);
  await app.listen(port, '0.0.0.0'); // Mandatory EC2
}
bootstrap();
