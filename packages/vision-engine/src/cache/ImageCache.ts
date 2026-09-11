import { randomUUID } from 'crypto';
import { ImageFrame } from '../image/ImageFrame';
import { CacheEntry } from './CacheEntry';

export class ImageCache {
  private entries = new Map<string, CacheEntry>();

  store(frame: ImageFrame): string {
    const id = typeof randomUUID === 'function' ? randomUUID() : `img_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    this.entries.set(id, {
      id,
      frame,
      createdAt: Date.now(),
    });
    return id;
  }

  get(id: string): ImageFrame | null {
    const entry = this.entries.get(id);
    return entry ? entry.frame : null;
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }

  size(): number {
    return this.entries.size;
  }
}
