import { describe, it, expect, beforeEach } from 'vitest';
import {
  ExecutionContext,
  InMemoryContextStore,
  ContextStore,
} from '../src';

describe('ExecutionContext', () => {
  let context: ExecutionContext;

  beforeEach(() => {
    context = new ExecutionContext();
  });

  it('set/get', () => {
    context.set('screenImage', { width: 1920, height: 1080 });
    context.set('activeWindow', 'Notepad');

    expect(context.get('screenImage')).toEqual({ width: 1920, height: 1080 });
    expect(context.get('activeWindow')).toBe('Notepad');
    expect(context.has('activeWindow')).toBe(true);
  });

  it('overwrite existing value', () => {
    context.set('count', 1);
    expect(context.get('count')).toBe(1);

    context.set('count', 2);
    expect(context.get('count')).toBe(2);
  });

  it('remove', () => {
    context.set('temp', 'to-be-deleted');
    expect(context.has('temp')).toBe(true);

    const removed = context.remove('temp');
    expect(removed).toBe(true);
    expect(context.has('temp')).toBe(false);
    expect(context.get('temp')).toBeUndefined();

    const removedAgain = context.remove('temp');
    expect(removedAgain).toBe(false);
  });

  it('clear', () => {
    context.set('a', 1);
    context.set('b', 2);
    context.set('c', 3);

    expect(context.keys()).toHaveLength(3);

    context.clear();

    expect(context.keys()).toHaveLength(0);
    expect(context.has('a')).toBe(false);
    expect(context.get('a')).toBeUndefined();
  });

  it('keys', () => {
    expect(context.keys()).toEqual([]);

    context.set('ocrResult', 'Detected text');
    context.set('mousePosition', { x: 100, y: 200 });

    const keys = context.keys();
    expect(keys).toContain('ocrResult');
    expect(keys).toContain('mousePosition');
    expect(keys).toHaveLength(2);
  });

  it('generic typing', () => {
    interface WindowState {
      title: string;
      pid: number;
    }

    const state: WindowState = { title: 'Code.exe', pid: 1234 };
    context.set<WindowState>('windowState', state);

    const retrieved = context.get<WindowState>('windowState');
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Code.exe');
    expect(retrieved!.pid).toBe(1234);
  });

  it('missing key', () => {
    expect(context.has('nonExistentKey')).toBe(false);
    expect(context.get('nonExistentKey')).toBeUndefined();
  });

  it('custom ContextStore via Dependency Injection', () => {
    class CustomContextStore implements ContextStore {
      private map = new Map<string, unknown>();

      set<T>(key: string, value: T): void {
        this.map.set(`custom_${key}`, value);
      }
      get<T>(key: string): T | undefined {
        return this.map.get(`custom_${key}`) as T | undefined;
      }
      has(key: string): boolean {
        return this.map.has(`custom_${key}`);
      }
      remove(key: string): boolean {
        return this.map.delete(`custom_${key}`);
      }
      clear(): void {
        this.map.clear();
      }
      keys(): string[] {
        return Array.from(this.map.keys());
      }
    }

    const customContext = new ExecutionContext(new CustomContextStore());
    customContext.set('key1', 'val1');

    expect(customContext.get('key1')).toBe('val1');
    expect(customContext.keys()).toEqual(['custom_key1']);
  });
});
