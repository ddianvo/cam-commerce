import { INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
export function setupApp(app: INestApplication, origin: string) {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );
}
