import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupApp } from './common/setup-app';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  const config = app.get(ConfigService);
  setupApp(app, config.getOrThrow<string>('CORS_ORIGIN'));
  app.useStaticAssets(join(__dirname, '..', 'frontend', 'dist'));
  (app.getHttpAdapter().getInstance() as import('express').Express).get(
    '/admin',
    (_req: unknown, res: import('express').Response) =>
      res.sendFile(join(__dirname, '..', 'frontend', 'dist', 'index.html')),
  );
  if (config.get<string>('NODE_ENV') !== 'production') {
    const apiConfig = new DocumentBuilder()
      .setTitle('Nest Commerce — API dùng thử')
      .setDescription(
        'Backend thương mại điện tử. Mở endpoint, bấm Try it out rồi Execute. Đăng nhập tại /api/auth/login; sao chép accessToken vào Authorize để thử giỏ hàng và checkout. Trợ lý mua sắm chạy tại máy chủ và dùng danh mục sản phẩm.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, apiConfig), {
      swaggerOptions: { persistAuthorization: true, docExpansion: 'list' },
      customSiteTitle: 'Nest Commerce API',
    });
  }
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<number>('PORT'));
}
void bootstrap().catch(() => {
  console.error('Application startup failed. Verify environment and database availability.');
  process.exitCode = 1;
});
