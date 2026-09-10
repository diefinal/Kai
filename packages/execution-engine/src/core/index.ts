import { IExecutionEngine, IEventBus, ICheckpointStore } from '../interfaces';
import { EventDispatcher, EventTypes } from '../events';
import { ExecutionStatus, ExecutionStateMachine } from '../state';
import { ExecutionPlan, StepResult } from '../workflow';
import { TaskQueue, RetryPolicy } from '../queue';

export class ExecutionContext {
  public status: ExecutionStatus = ExecutionStatus.CREATED;
  public currentStepIndex: number = 0;
  public stepRetries: Record<string, number> = {};
  
  constructor(public plan: ExecutionPlan) {}
}

export class ExecutionManager {
  private contexts = new Map<string, ExecutionContext>();
  private dispatcher: EventDispatcher;
  private permissionResolvers = new Map<string, (granted: boolean) => void>();

  constructor(
    private eventBus: IEventBus,
    private checkpointStore: ICheckpointStore,
    private executorFn: (step: any, ctx: any) => Promise<StepResult>
  ) {
    this.dispatcher = new EventDispatcher(eventBus);
  }

  private async changeState(ctx: ExecutionContext, newState: ExecutionStatus) {
    if (!ExecutionStateMachine.validate(ctx.status, newState)) {
      throw new Error(`Invalid state transition from ${ctx.status} to ${newState}`);
    }
    ctx.status = newState;
    await this.checkpointStore.save(ctx.plan.id, ctx);
    this.dispatcher.dispatch(EventTypes.Checkpoint, { id: ctx.plan.id, state: ctx.status });
  }

  async submit(plan: ExecutionPlan) {
    const ctx = new ExecutionContext(plan);
    this.contexts.set(plan.id, ctx);
    
    this.dispatcher.dispatch(EventTypes.ExecutionCreated, { id: plan.id });
    
    await this.changeState(ctx, ExecutionStatus.QUEUED);
    
    // Simulate picking up from queue immediately for now
    this.process(ctx.plan.id);
    return plan.id;
  }

  async recover(executionId: string) {
    const state = await this.checkpointStore.load(executionId);
    if (!state) throw new Error('Checkpoint not found');
    
    const plan = new ExecutionPlan(state.plan.id, state.plan.steps, state.plan.context);
    const ctx = new ExecutionContext(plan);
    ctx.status = state.status;
    ctx.currentStepIndex = state.currentStepIndex;
    ctx.stepRetries = state.stepRetries || {};
    this.contexts.set(executionId, ctx);
    
    if (ctx.status === ExecutionStatus.WAITING_PERMISSION || ctx.status === ExecutionStatus.EXECUTING || ctx.status === ExecutionStatus.RETRYING) {
        // Automatically resume
        if (ctx.status !== ExecutionStatus.WAITING_PERMISSION) {
            await this.changeState(ctx, ExecutionStatus.EXECUTING);
        }
        this.process(executionId);
    }
  }

  async providePermission(executionId: string, granted: boolean) {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    
    if (ctx.status !== ExecutionStatus.WAITING_PERMISSION) return;

    const resolver = this.permissionResolvers.get(executionId);
    if (!resolver) return;

    this.permissionResolvers.delete(executionId);

    if (granted) {
      this.dispatcher.dispatch(EventTypes.PermissionGranted, { id: executionId });
      await this.changeState(ctx, ExecutionStatus.EXECUTING);
      resolver(true);
    } else {
      this.dispatcher.dispatch(EventTypes.PermissionDenied, { id: executionId });
      await this.changeState(ctx, ExecutionStatus.FAILED);
      this.dispatcher.dispatch(EventTypes.ExecutionFailed, { id: executionId, reason: 'Permission denied' });
      resolver(false);
    }
  }

  private async process(executionId: string) {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;

    if (ctx.status === ExecutionStatus.QUEUED) {
      await this.changeState(ctx, ExecutionStatus.PLANNING);
      await this.changeState(ctx, ExecutionStatus.EXECUTING);
      this.dispatcher.dispatch(EventTypes.ExecutionStarted, { id: executionId });
    }

    while (ctx.currentStepIndex < ctx.plan.steps.length) {
      const step = ctx.plan.steps[ctx.currentStepIndex];
      
      if (step.requiresPermission) {
         if (ctx.status !== ExecutionStatus.WAITING_PERMISSION) {
           // Fresh permission request — transition and emit event
           await this.changeState(ctx, ExecutionStatus.WAITING_PERMISSION);
           this.dispatcher.dispatch(EventTypes.PermissionRequested, { id: executionId, stepId: step.id });
         }

         // Wait for external grant/deny (covers both fresh request and recovery)
         const granted = await new Promise<boolean>((resolve) => {
           this.permissionResolvers.set(executionId, resolve);
         });

         if (!granted) {
           return; // Permission denied — failure events already emitted
         }
         // Permission granted — status already set to EXECUTING by providePermission
      }

      this.dispatcher.dispatch(EventTypes.StepStarted, { id: executionId, stepId: step.id });
      
      try {
        const result = await this.executorFn(step, ctx.plan.context);
        if (result.success) {
          ctx.currentStepIndex++;
          this.dispatcher.dispatch(EventTypes.StepCompleted, { id: executionId, stepId: step.id, result: result.output });
          await this.checkpointStore.save(ctx.plan.id, ctx);
          this.dispatcher.dispatch(EventTypes.Checkpoint, { id: ctx.plan.id, state: ctx.status });
        } else {
          // Handle retry
          const retries = ctx.stepRetries[step.id] || 0;
          if (RetryPolicy.shouldRetry(retries, step.maxRetries)) {
            ctx.stepRetries[step.id] = retries + 1;
            await this.changeState(ctx, ExecutionStatus.RETRYING);
            await this.changeState(ctx, ExecutionStatus.EXECUTING);
            continue; // retry loop
          } else {
            await this.changeState(ctx, ExecutionStatus.FAILED);
            this.dispatcher.dispatch(EventTypes.ExecutionFailed, { id: executionId, error: result.error });
            return;
          }
        }
      } catch (err: any) {
         await this.changeState(ctx, ExecutionStatus.FAILED);
         this.dispatcher.dispatch(EventTypes.ExecutionFailed, { id: executionId, error: err.message });
         return;
      }
    }

    if (ctx.status === ExecutionStatus.EXECUTING) {
       await this.changeState(ctx, ExecutionStatus.COMPLETED);
       this.dispatcher.dispatch(EventTypes.ExecutionCompleted, { id: executionId });
    }
  }
}

export class ExecutionEngine implements IExecutionEngine {
  private manager: ExecutionManager;
  
  constructor(
    eventBus: IEventBus,
    checkpointStore: ICheckpointStore,
    executorFn: (step: any, ctx: any) => Promise<StepResult>
  ) {
    this.manager = new ExecutionManager(eventBus, checkpointStore, executorFn);
  }

  async submit(plan: ExecutionPlan): Promise<string> {
    return this.manager.submit(plan);
  }

  async providePermission(executionId: string, granted: boolean): Promise<void> {
    return this.manager.providePermission(executionId, granted);
  }

  async recover(executionId: string): Promise<void> {
    return this.manager.recover(executionId);
  }
}
