import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MemoryEngine, SqliteMemoryStore, StubEmbeddingProvider } from '../src/longterm';

describe('Long-Term Memory Engine (MEMORY-001)', () => {
  let engine: MemoryEngine;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `kai-memory-test-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.db`);
    engine = new MemoryEngine({ dbPath: tempDbPath });
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.close();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // Ignore cleanup failure on Windows temp lock
      }
    }
  });

  describe('Core CRUD Operations', () => {
    it('saves and recalls a memory record', async () => {
      const record = await engine.remember(
        'user_preference',
        'Preferred Browser',
        'Edge',
        { tags: ['browser', 'default'], importance: 1.0 }
      );

      expect(record.id).toBeDefined();
      expect(record.category).toBe('user_preference');
      expect(record.title).toBe('Preferred Browser');
      expect(record.content).toBe('Edge');
      expect(record.tags).toContain('browser');

      const recalled = await engine.recall('Preferred Browser');
      expect(recalled).not.toBeNull();
      expect(recalled?.content).toBe('Edge');
    });

    it('updates existing memory record', async () => {
      const saved = await engine.remember(
        'user_preference',
        'Preferred Browser',
        'Edge'
      );

      const updated = await engine.update(saved.id, {
        content: 'Chrome',
        importance: 0.8,
      });

      expect(updated).not.toBeNull();
      expect(updated?.content).toBe('Chrome');
      expect(updated?.importance).toBe(0.8);

      const recalled = await engine.recall('Preferred Browser');
      expect(recalled?.content).toBe('Chrome');
    });

    it('deletes / forgets memory record', async () => {
      const saved = await engine.remember(
        'projects',
        'Pizza Bomb',
        'D:\\Projects\\PizzaBomb'
      );

      const deleted = await engine.forget(saved.id);
      expect(deleted).toBe(true);

      const recalled = await engine.recall('Pizza Bomb');
      expect(recalled).toBeNull();
    });
  });

  describe('Persistence Across Restarts', () => {
    it('persists data after engine restart with SQLite file', async () => {
      // 1. Save data in first engine instance
      await engine.remember(
        'projects',
        'Pizza Bomb',
        'D:\\Projects\\PizzaBomb',
        { tags: ['proposal', 'client'], importance: 0.9 }
      );
      await engine.remember(
        'user_preference',
        'Preferred Browser',
        'Edge'
      );

      // Close first engine
      await engine.close();

      // 2. Open new engine on the same database path (simulating restart)
      const newEngine = new MemoryEngine({ dbPath: tempDbPath });
      await newEngine.initialize();

      const projectRecalled = await newEngine.recall('Pizza Bomb');
      expect(projectRecalled).not.toBeNull();
      expect(projectRecalled?.content).toBe('D:\\Projects\\PizzaBomb');
      expect(projectRecalled?.tags).toContain('proposal');

      const browserRecalled = await newEngine.recall('Preferred Browser');
      expect(browserRecalled).not.toBeNull();
      expect(browserRecalled?.content).toBe('Edge');

      await newEngine.close();
    });
  });

  describe('Category Filtering & Retrieval', () => {
    beforeEach(async () => {
      await engine.remember('user_preference', 'Preferred Theme', 'Dark Mode');
      await engine.remember('user_preference', 'Language', 'Turkish');
      await engine.remember('projects', 'Pizza Bomb', 'D:\\Projects\\PizzaBomb');
      await engine.remember('repositories', 'Kai Repo', 'https://github.com/diefinal/Kai');
      await engine.remember('custom_workflows', 'Deploy Workflow', 'pnpm build && pnpm deploy', { importance: 2.0 });
    });

    it('filters recent memories by category', async () => {
      const preferences = await engine.recent(10, 'user_preference');
      expect(preferences.length).toBe(2);
      expect(preferences.every((p) => p.category === 'user_preference')).toBe(true);

      const projects = await engine.recent(10, 'projects');
      expect(projects.length).toBe(1);
      expect(projects[0].title).toBe('Pizza Bomb');
    });

    it('retrieves important memories', async () => {
      const important = await engine.important(5);
      expect(important.length).toBeGreaterThan(0);
      expect(important[0].importance).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('Semantic & Vector Similarity Search', () => {
    it('finds similar memories using embeddings', async () => {
      await engine.remember('projects', 'Pizza Bomb Proposal', 'Pizza Bomb client proposal draft proposal.docx');
      await engine.remember('projects', 'Sushi Roll Architecture', 'Sushi Roll software architecture diagram');
      await engine.remember('user_preference', 'Preferred Editor', 'Visual Studio Code editor');

      const similar = await engine.similar('Pizza Bomb offer proposal document', 2);
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].record.title).toBe('Pizza Bomb Proposal');
      expect(similar[0].score).toBeGreaterThan(0);
    });

    it('performs keyword and hybrid search', async () => {
      await engine.remember('learned_behaviors', 'Git Push Habit', 'Always run tests before push');
      const results = await engine.search('tests before push');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].record.title).toBe('Git Push Habit');
    });
  });
});
