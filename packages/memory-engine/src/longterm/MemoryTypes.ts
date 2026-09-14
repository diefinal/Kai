export type MemoryCategory =
  | 'user_preference'
  | 'projects'
  | 'repositories'
  | 'applications'
  | 'recent_conversations'
  | 'frequently_used_commands'
  | 'custom_workflows'
  | 'learned_behaviors'
  | string;

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  importance: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface MemoryFilter {
  category?: MemoryCategory;
  tags?: string[];
  minImportance?: number;
  startDate?: Date;
  endDate?: Date;
  profileId?: string;
}

export interface MemorySearchOptions extends MemoryFilter {
  limit?: number;
  offset?: number;
  minSimilarity?: number;
  sortBy?: 'relevance' | 'recency' | 'importance';
}

export interface MemorySearchResult {
  record: MemoryRecord;
  score: number;
  matchedBy: 'keyword' | 'semantic' | 'exact';
}

export interface IMemoryStore {
  initialize(): Promise<void>;
  close(): Promise<void>;
  save(record: MemoryRecord): Promise<void>;
  get(id: string): Promise<MemoryRecord | null>;
  update(id: string, updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>): Promise<MemoryRecord | null>;
  delete(id: string): Promise<boolean>;
  find(filter?: MemoryFilter, limit?: number, offset?: number): Promise<MemoryRecord[]>;
  searchKeywords(query: string, filter?: MemoryFilter, limit?: number): Promise<MemoryRecord[]>;
  getAll(): Promise<MemoryRecord[]>;
  count(filter?: MemoryFilter): Promise<number>;
}
