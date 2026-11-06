import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { ChatMessage } from './ai.schemas';
@Injectable()
export class LlmService {
  private readonly client?: OpenAI;
  private readonly model: string;
  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    if (apiKey) this.client = new OpenAI({ apiKey, timeout: 20000, maxRetries: 0 });
    this.model = config.getOrThrow<string>('OPENAI_MODEL');
  }
  async generate<T extends z.ZodTypeAny>(
    name: string,
    instruction: string,
    messages: ChatMessage[],
    schema: T,
  ): Promise<z.infer<T>> {
    if (!this.client)
      throw new ServiceUnavailableException('Chưa cấu hình OPENAI_API_KEY cho chatbot');
    try {
      const response = await this.client.responses.parse({
        model: this.model,
        store: false,
        max_output_tokens: 1200,
        input: [{ role: 'system', content: instruction }, ...messages],
        text: { format: zodTextFormat(schema, name) },
      });
      if (!response.output_parsed || response.status !== 'completed')
        throw new Error('LLM refused or returned incomplete output');
      return schema.parse(response.output_parsed);
    } catch {
      throw new ServiceUnavailableException(
        'Dịch vụ tư vấn AI tạm thời không khả dụng, vui lòng thử lại',
      );
    }
  }
}
