export class RetryHandler {
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    onRetry?: (attempt: number, error: any) => Promise<void>
  ): Promise<T> {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        attempts++;
        return await operation();
      } catch (err) {
        if (attempts >= maxRetries) {
          throw err;
        }
        if (onRetry) {
          await onRetry(attempts, err);
        }
      }
    }
    throw new Error('Retry exhausted');
  }
}
