// Chat message types and utilities

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'text' | 'payment' | 'tool-result' | 'image';
  metadata?: {
    amount?: string;
    token?: string;
    txHash?: string;
    toolName?: string;
    imageType?: string;
  };
}

export const generateId = () => Math.random().toString(36).substring(7);
