import type { KaiDesktopApi } from '../preload/PreloadBridge';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

declare global {
  interface Window {
    kai?: KaiDesktopApi;
  }
}