import { ImageFrame } from '../image/ImageFrame';

export interface CacheEntry {
  id: string;
  frame: ImageFrame;
  createdAt: number;
}
