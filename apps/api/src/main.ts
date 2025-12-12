import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 诊断：打印每个请求（方法/路径/Content-Type）
  app.use((req: any, _res: any, next: any) => {
    // eslint-disable-next-line no-console
    console.log(`[REQ] ${req.method} ${req.url} ct=${req.headers?.['content-type'] || ''}`);
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 静态文件：用于暴露上传的图片给视觉接口拉取
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[BOOT] listening on ${port}`);
}

bootstrap();
