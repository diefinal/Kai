export type RollbackAction = () => Promise<void>;

export class RollbackManager {
  private stack: RollbackAction[] = [];

  public register(action: RollbackAction): void {
    this.stack.push(action);
  }

  public async rollbackAll(): Promise<void> {
    while (this.stack.length > 0) {
      const action = this.stack.pop();
      if (action) {
        try {
          await action();
        } catch (e) {
          // Continue rolling back remaining actions
        }
      }
    }
  }

  public clear(): void {
    this.stack = [];
  }
}
