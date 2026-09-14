import { IEmbeddingProvider, StubEmbeddingProvider } from './EmbeddingProvider';
import { MemoryIndex } from './MemoryIndex';
import { MemoryRetriever } from './MemoryRetriever';
import { SqliteMemoryStore } from './MemoryStore';
import {
  IMemoryStore,
  MemoryCategory,
  MemoryRecord,
  MemorySearchOptions,
  MemorySearchResult,
} from './MemoryTypes';

export interface MemoryEngineOptions {
  store?: IMemoryStore;
  embeddingProvider?: IEmbeddingProvider;
  dbPath?: string;
}

export class MemoryEngine {
  private readonly store: IMemoryStore;
  private readonly embeddingProvider: IEmbeddingProvider;
  private readonly retriever: MemoryRetriever;
  private readonly index: MemoryIndex;
  private initialized = false;

  constructor(options: MemoryEngineOptions = {}) {
    this.store = options.store || new SqliteMemoryStore({ dbPath: options.dbPath });
    this.embeddingProvider = options.embeddingProvider || new StubEmbeddingProvider();
    this.retriever = new MemoryRetriever(this.store, this.embeddingProvider);
    this.index = new MemoryIndex();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.store.initialize();

    const all = await this.store.getAll();
    for (const rec of all) {
      this.index.indexRecord(rec);
    }
    this.initialized = true;
  }

  async close(): Promise<void> {
    await this.store.close();
    this.index.clear();
    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async save(
    data: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<MemoryRecord, 'id'>>
  ): Promise<MemoryRecord> {
    await this.ensureInitialized();

    const id = data.id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const embedding =
      data.embedding ||
      (await this.embeddingProvider.generateEmbedding(`${data.title} ${data.content} ${(data.tags || []).join(' ')}`));

    const record: MemoryRecord = {
      id,
      category: data.category,
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      importance: data.importance ?? 1.0,
      createdAt: now,
      updatedAt: now,
      embedding,
      metadata: data.metadata,
    };

    await this.store.save(record);
    this.index.indexRecord(record);
    return record;
  }

  async remember(
    category: MemoryCategory,
    title: string,
    content: string,
    options?: {
      tags?: string[];
      importance?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryRecord> {
    return this.save({
      category,
      title,
      content,
      tags: options?.tags || [],
      importance: options?.importance ?? 1.0,
      metadata: options?.metadata,
    });
  }

  async recall(query: string, options?: MemorySearchOptions): Promise<MemoryRecord | null> {
    const results = await this.search(query, { ...options, limit: 1 });
    return results.length > 0 ? results[0].record : null;
  }

  async search(query: string, options?: MemorySearchOptions): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();
    return this.retriever.retrieve(query, options);
  }

  async update(
    id: string,
    updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>
  ): Promise<MemoryRecord | null> {
    await this.ensureInitialized();

    if (updates.title || updates.content || updates.tags) {
      const existing = await this.store.get(id);
      if (existing && !updates.embedding) {
        const title = updates.title || existing.title;
        const content = updates.content || existing.content;
        const tags = updates.tags || existing.tags;
        updates.embedding = await this.embeddingProvider.generateEmbedding(
          `${title} ${content} ${tags.join(' ')}`
        );
      }
    }

    const updated = await this.store.update(id, updates);
    if (updated) {
      this.index.indexRecord(updated);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const existing = await this.store.get(id);
    if (existing) {
      this.index.removeRecord(existing);
    }
    return this.store.delete(id);
  }

  async forget(id: string): Promise<boolean> {
    return this.delete(id);
  }

  async recent(limit = 10, category?: MemoryCategory): Promise<MemoryRecord[]> {
    await this.ensureInitialized();
    return this.store.find({ category }, limit, 0);
  }

  async important(limit = 10, category?: MemoryCategory): Promise<MemoryRecord[]> {
    await this.ensureInitialized();
    const results = await this.store.find(
      { category, minImportance: 1.0 },
      limit * 2,
      0
    );
    results.sort((a, b) => b.importance - a.importance);
    return results.slice(0, limit);
  }

  async similar(
    embeddingOrText: number[] | string,
    limit = 10,
    category?: MemoryCategory
  ): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();
    return this.retriever.findSimilar(embeddingOrText, limit, category);
  }

  getStore(): IMemoryStore {
    return this.store;
  }

  getEmbeddingProvider(): IEmbeddingProvider {
    return this.embeddingProvider;
  }
}
