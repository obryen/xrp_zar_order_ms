import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function listenCallback() {
  Logger.log(
    `*** Application running on port [3000] ***`,
  );
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000, listenCallback);
}
bootstrap();
