import {
  ConflictException,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { ChatState } from './ai.schemas';
interface Entry {
  state: ChatState;
  expiresAt: number;
}
@Injectable()
export class ChatMemoryService implements OnModuleDestroy {
  private readonly redis?: Redis;
  private redisReady?: Promise<void>;
  private readonly sessions = new Map<string, Entry>();
  private readonly busy = new Set<string>();
  private readonly ttl: number;
  private readonly maxSessions: number;
  constructor(config: ConfigService) {
    this.ttl = config.getOrThrow<number>('CHAT_TTL_SECONDS');
    this.maxSessions = config.getOrThrow<number>('CHAT_MAX_SESSIONS');
    const url = config.get<string>('REDIS_URL');
    if (url) {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 3000,
        commandTimeout: 5000,
        retryStrategy: () => null,
      });
      this.redis.on('error', () => {
        /* Redis errors surface as sanitized HTTP 503 below. */
      });
    }
  }
  async withSession<T>(
    userId: string,
    sessionId: string,
    fn: (state: ChatState) => Promise<{ state: ChatState; result: T }>,
  ): Promise<T> {
    const key = 'chat:' + userId + ':' + sessionId;
    if (this.redis) return this.withRedis(key, fn);
    const now = Date.now();
    for (const [id, entry] of this.sessions) if (entry.expiresAt <= now) this.sessions.delete(id);
    if (this.busy.has(key)) throw new ConflictException('Phiên chat đang xử lý một tin nhắn khác');
    if (!this.sessions.has(key) && this.sessions.size + this.busy.size >= this.maxSessions)
      throw new ServiceUnavailableException('Bộ nhớ chat đầy, hãy thử lại sau');
    this.busy.add(key);
    try {
      const state = structuredClone(this.sessions.get(key)?.state ?? { history: [] });
      const output = await fn(state);
      this.sessions.set(key, {
        state: { history: output.state.history.slice(-24) },
        expiresAt: Date.now() + this.ttl * 1000,
      });
      return output.result;
    } finally {
      this.busy.delete(key);
    }
  }
  private async withRedis<T>(
    key: string,
    fn: (state: ChatState) => Promise<{ state: ChatState; result: T }>,
  ): Promise<T> {
    const redis = this.redis!;
    const lockKey = key + ':lock';
    const token = randomUUID();
    try {
      if (redis.status !== 'ready') {
        this.redisReady ??= redis
          .connect()
          .then(() => undefined)
          .finally(() => {
            this.redisReady = undefined;
          });
        await this.redisReady;
      }
      if ((await redis.set(lockKey, token, 'PX', 120000, 'NX')) !== 'OK')
        throw new ConflictException('Phiên chat đang xử lý một tin nhắn khác');
      try {
        const raw = await redis.get(key);
        const state: ChatState = raw ? (JSON.parse(raw) as ChatState) : { history: [] };
        const output = await fn(state);
        // Fencing: an expired lock holder cannot overwrite a newer conversation.
        const saved = await redis.eval(
          'if redis.call("get", KEYS[1]) == ARGV[1] then redis.call("set", KEYS[2], ARGV[2], "EX", ARGV[3]); return 1 else return 0 end',
          2,
          lockKey,
          key,
          token,
          JSON.stringify({ history: output.state.history.slice(-24) }),
          this.ttl,
        );
        if (saved !== 1) throw new ConflictException('Phiên xử lý đã hết hạn, vui lòng thử lại');
        return output.result;
      } finally {
        await redis.eval(
          'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
          1,
          lockKey,
          token,
        );
      }
    } catch (error) {
      if (error instanceof ConflictException || error instanceof ServiceUnavailableException)
        throw error;
      throw new ServiceUnavailableException(
        'Không thể xử lý hoặc lưu phiên chat, vui lòng thử lại',
      );
    }
  }
  onModuleDestroy() {
    this.redis?.disconnect();
  }
}
