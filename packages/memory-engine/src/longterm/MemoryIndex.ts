import { MemoryRecord } from './MemoryTypes';

export class MemoryIndex {
  private tagIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();

  indexRecord(record: MemoryRecord): void {
    // Index category
    if (!this.categoryIndex.has(record.category)) {
      this.categoryIndex.set(record.category, new Set());
    }
    this.categoryIndex.get(record.category)!.add(record.id);

    // Index tags
    for (const tag of record.tags) {
      const lower = tag.toLowerCase();
      if (!this.tagIndex.has(lower)) {
        this.tagIndex.set(lower, new Set());
      }
      this.tagIndex.get(lower)!.add(record.id);
    }
  }

  removeRecord(record: MemoryRecord): void {
    const catSet = this.categoryIndex.get(record.category);
    if (catSet) catSet.delete(record.id);

    for (const tag of record.tags) {
      const tagSet = this.tagIndex.get(tag.toLowerCase());
      if (tagSet) tagSet.delete(record.id);
    }
  }

  getIdsByTag(tag: string): string[] {
    const set = this.tagIndex.get(tag.toLowerCase());
    return set ? Array.from(set) : [];
  }

  getIdsByCategory(category: string): string[] {
    const set = this.categoryIndex.get(category);
    return set ? Array.from(set) : [];
  }

  clear(): void {
    this.tagIndex.clear();
    this.categoryIndex.clear();
  }
}
