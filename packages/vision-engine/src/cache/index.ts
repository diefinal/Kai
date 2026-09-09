import { ISnapshotCache } from '../interfaces';

export class SnapshotCache implements ISnapshotCache {
  private store = new Map<string, any>();

  get(hash: string): any | null {
    return this.store.get(hash) || null;
  }

  set(hash: string, snapshot: any): void {
    this.store.set(hash, snapshot);
  }
}
