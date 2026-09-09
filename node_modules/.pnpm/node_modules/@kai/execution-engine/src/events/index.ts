import { IEventBus } from '../interfaces';
import { EventEmitter } from 'events';

export enum EventTypes {
  ExecutionCreated = 'ExecutionCreated',
  ExecutionStarted = 'ExecutionStarted',
  StepStarted = 'StepStarted',
  StepCompleted = 'StepCompleted',
  ExecutionCompleted = 'ExecutionCompleted',
  ExecutionFailed = 'ExecutionFailed',
  PermissionRequested = 'PermissionRequested',
  PermissionGranted = 'PermissionGranted',
  PermissionDenied = 'PermissionDenied',
  Checkpoint = 'Checkpoint'
}

export class EventDispatcher {
  constructor(private bus: IEventBus) {}
  dispatch(event: EventTypes, payload: any) {
    this.bus.publish(event, payload);
  }
}

export class EventBus implements IEventBus {
  private emitter = new EventEmitter();
  
  publish(eventName: string, payload: any): void {
    this.emitter.emit(eventName, payload);
  }
  
  subscribe(eventName: string, handler: (payload: any) => void): void {
    this.emitter.on(eventName, handler);
  }
}
