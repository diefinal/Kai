import { ExecutionQueue } from '../scheduler/ExecutionQueue';
import { ExecutionContext } from '../context/ExecutionContext';
import { ExecutionResult } from './ExecutionResult';

export interface ExecutionAdapter {
  execute(
    queue: ExecutionQueue,
    context: ExecutionContext
  ): Promise<ExecutionResult>;
}
