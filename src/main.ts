import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  app.enableCors();

  // --- Swagger setup ---
  const config = new DocumentBuilder()
    .setTitle('Loan Management API')
    .setDescription('API for Loan Disbursement & Repayment System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);

  console.log('🚀 Application running on http://localhost:3000');
  console.log('📄 Swagger docs available at http://localhost:3000/api');
}

bootstrap();
