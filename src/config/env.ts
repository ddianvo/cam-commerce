import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_SECONDS: z.coerce.number().int().min(60).max(86400).default(900),
  REDIS_URL: z.string().url().optional().or(z.literal('')),
  CHAT_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
  CHAT_MAX_SESSIONS: z.coerce.number().int().min(1).max(10000).default(1000),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
});
export function validateEnv(env: Record<string, unknown>) {
  return schema.parse(env);
}
