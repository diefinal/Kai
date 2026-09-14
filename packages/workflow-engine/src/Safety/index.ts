export interface SafetyAction {
  type: string;
  target?: string;
  isDestructive: boolean;
}

export class SafetyManager {
  private dangerousPatterns = [
    'delete', 'remove', 'format', 'overwrite',
    'git push --force', 'force push', 'drop database',
    'registry', 'system settings'
  ];

  public requiresConfirmation(actionDescription: string): boolean {
    const lower = actionDescription.toLowerCase();
    return this.dangerousPatterns.some(pattern => lower.includes(pattern));
  }

  public async requestApproval(actionDescription: string, confirmFn: () => Promise<boolean>): Promise<boolean> {
    if (this.requiresConfirmation(actionDescription)) {
      return await confirmFn();
    }
    return true;
  }
}
