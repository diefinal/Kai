export type WorkflowStage =
  | 'Planning...'
  | 'Reading Repository...'
  | 'Editing Files...'
  | 'Building...'
  | 'Running Tests...'
  | 'Fixing Errors...'
  | 'Verifying...'
  | 'Completed'
  | 'Failed';

export interface WorkflowProgressState {
  currentStage: WorkflowStage;
  stepIndex: number;
  totalSteps: number;
  details?: string;
}

export type ProgressListener = (state: WorkflowProgressState) => void;

export class ProgressTracker {
  private listeners: ProgressListener[] = [];
  private state: WorkflowProgressState = {
    currentStage: 'Planning...',
    stepIndex: 0,
    totalSteps: 1
  };

  public onProgress(listener: ProgressListener): void {
    this.listeners.push(listener);
  }

  public update(stage: WorkflowStage, stepIndex: number, totalSteps: number, details?: string): void {
    this.state = { currentStage: stage, stepIndex, totalSteps, details };
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public getState(): WorkflowProgressState {
    return { ...this.state };
  }
}
