import { ContextStore, InMemoryContextStore } from './ContextStore';

export class ExecutionContext {
  constructor(private readonly store: ContextStore = new InMemoryContextStore()) {}

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get<T>(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  remove(key: string): boolean {
    return this.store.remove(key);
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return this.store.keys();
  }
}
