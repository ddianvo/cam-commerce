import { z } from 'zod';
export const NeedsSchema = z
  .object({
    keywords: z.array(z.string().max(50)).max(8),
    category: z.string().max(100).nullable(),
    minPrice: z.number().int().min(0).max(1000000000).nullable(),
    maxPrice: z.number().int().min(0).max(1000000000).nullable(),
    clarification: z.string().max(500).nullable(),
  })
  .strict();
export const AdviceSchema = z
  .object({ text: z.string().min(1).max(3000), productIds: z.array(z.string().uuid()).max(5) })
  .strict();
export type Advice = z.infer<typeof AdviceSchema>;
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatState {
  history: ChatMessage[];
}
