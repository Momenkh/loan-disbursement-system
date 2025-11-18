import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditService } from './modules/audit/audit.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);



  const auditService = app.get(AuditService);
  app.useGlobalInterceptors(new AuditInterceptor(auditService));  

  // Enable global validation pipe
  app.useGlobalPipes(new (require('@nestjs/common').ValidationPipe)({ whitelist: true }));

  // --- Swagger setup ---
  const config = new DocumentBuilder()
    .setTitle('Loan Management API')
    .setDescription('API for Loan Disbursement & Repayment System')
    .setVersion('1.0')
    .addBearerAuth() // JWT auth
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('🚀 Application running on http://localhost:3000');
  console.log('📄 Swagger docs available at http://localhost:3000/api');
}
bootstrap();
