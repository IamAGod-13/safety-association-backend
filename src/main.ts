import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // فیلدهای اضافی حذف میشن
      forbidNonWhitelisted: true, // اگر فیلد اضافی بیاد error
      transform: true, // تبدیل type ها
    }),
  );

  // 🔐 CORS (خیلی مهم برای فرانت)
  app.enableCors({
    origin: ['http://localhost:3000',
      'https://youur-domain.com',
    ],
    credentials: true,
  });

  // 🔐 Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 📚 Swagger Config
  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT || 3000);

}

bootstrap();