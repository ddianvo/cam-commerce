import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Principal } from '../auth/auth.decorators';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}
  @Post('chat')
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  chat(@CurrentUser() user: Principal, @Body() dto: ChatDto) {
    return this.ai.chat(user.id, dto);
  }
}
