import { DatabaseSync } from 'node:sqlite';
import { IMemoryStore, MemoryFilter, MemoryRecord } from './MemoryTypes';

export interface SqliteMemoryStoreOptions {
  dbPath?: string; // ':memory:' or file path
}

export class SqliteMemoryStore implements IMemoryStore {
  private db: DatabaseSync | null = null;
  private readonly dbPath: string;

  constructor(options: SqliteMemoryStoreOptions = {}) {
    this.dbPath = options.dbPath || ':memory:';
  }

  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = new DatabaseSync(this.dbPath);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        importance REAL NOT NULL,
        embedding TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories (category);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories (importance);
      CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories (updated_at);
    `);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private getDb(): DatabaseSync {
    if (!this.db) {
      throw new Error('Memory store is not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async save(record: MemoryRecord): Promise<void> {
    const db = this.getDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO memories (
        id, category, title, content, tags, created_at, updated_at, importance, embedding, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.category,
      record.title,
      record.content,
      JSON.stringify(record.tags || []),
      record.createdAt.getTime(),
      record.updatedAt.getTime(),
      record.importance,
      record.embedding ? JSON.stringify(record.embedding) : null,
      record.metadata ? JSON.stringify(record.metadata) : null
    );
  }

  async get(id: string): Promise<MemoryRecord | null> {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM memories WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  async update(
    id: string,
    updates: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>
  ): Promise<MemoryRecord | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated: MemoryRecord = {
      ...existing,
      ...updates,
      updatedAt: updates.updatedAt || new Date(),
    };

    await this.save(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = this.getDb();
    const stmt = db.prepare('DELETE FROM memories WHERE id = ?');
    stmt.run(id);
    return true;
  }

  async find(filter?: MemoryFilter, limit = 50, offset = 0): Promise<MemoryRecord[]> {
    const db = this.getDb();
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params: any[] = [];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.minImportance !== undefined) {
      sql += ' AND importance >= ?';
      params.push(filter.minImportance);
    }
    if (filter?.startDate) {
      sql += ' AND created_at >= ?';
      params.push(filter.startDate.getTime());
    }
    if (filter?.endDate) {
      sql += ' AND created_at <= ?';
      params.push(filter.endDate.getTime());
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => this.mapRowToRecord(r));
  }

  async searchKeywords(
    query: string,
    filter?: MemoryFilter,
    limit = 20
  ): Promise<MemoryRecord[]> {
    const db = this.getDb();
    const pattern = `%${query.toLowerCase()}%`;
    let sql = `
      SELECT * FROM memories
      WHERE (LOWER(title) LIKE ? OR LOWER(content) LIKE ? OR LOWER(tags) LIKE ?)
    `;
    const params: any[] = [pattern, pattern, pattern];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.minImportance !== undefined) {
      sql += ' AND importance >= ?';
      params.push(filter.minImportance);
    }

    sql += ' ORDER BY importance DESC, updated_at DESC LIMIT ?';
    params.push(limit);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map((r) => this.mapRowToRecord(r));
  }

  async getAll(): Promise<MemoryRecord[]> {
    const db = this.getDb();
    const stmt = db.prepare('SELECT * FROM memories ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapRowToRecord(r));
  }

  async count(filter?: MemoryFilter): Promise<number> {
    const db = this.getDb();
    let sql = 'SELECT COUNT(*) as count FROM memories WHERE 1=1';
    const params: any[] = [];

    if (filter?.category) {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.minImportance !== undefined) {
      sql += ' AND importance >= ?';
      params.push(filter.minImportance);
    }

    const stmt = db.prepare(sql);
    const row = stmt.get(...params) as any;
    return row?.count || 0;
  }

  private mapRowToRecord(row: any): MemoryRecord {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      content: row.content,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: new Date(Number(row.created_at)),
      updatedAt: new Date(Number(row.updated_at)),
      importance: Number(row.importance),
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
