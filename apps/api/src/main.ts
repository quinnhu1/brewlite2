import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configure an exact trusted proxy hop count only when deployed behind that proxy.
  if (process.env.TRUST_PROXY_HOPS) app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  });


  const config = new DocumentBuilder()
    .setTitle('BrewLite API')
    .setDescription('API documentation for BrewLite')
    .setVersion('1.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = Number(process.env.PORT ?? 3001);

  await app.listen(port);

  console.log(`BrewLite API is running at http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/swagger`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start BrewLite API', error);
  process.exitCode = 1;
});
