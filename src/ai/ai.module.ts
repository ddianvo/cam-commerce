import { Module } from '@nestjs/common';
import { ProductModule } from '../products/product.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ChatMemoryService } from './chat-memory.service';
@Module({
  imports: [ProductModule],
  providers: [AiService, ChatMemoryService],
  controllers: [AiController],
})
export class AiModule {}
