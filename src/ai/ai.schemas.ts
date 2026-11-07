import { ShoppingNeeds } from './shopping-needs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatState {
  history: ChatMessage[];
  needs?: ShoppingNeeds;
}
