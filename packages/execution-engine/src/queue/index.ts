export class TaskQueue {
  private queue: any[] = [];
  
  enqueue(item: any) {
    this.queue.push(item);
  }
  
  dequeue() {
    return this.queue.shift();
  }
  
  get length() {
    return this.queue.length;
  }
}

export class RetryPolicy {
  static shouldRetry(currentAttempts: number, maxRetries: number): boolean {
    return currentAttempts < maxRetries;
  }
}
