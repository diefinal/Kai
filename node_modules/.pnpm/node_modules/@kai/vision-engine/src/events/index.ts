import { IEventBus } from '../interfaces';
import { EventEmitter } from 'events';

export enum VisionEventTypes {
  ScreenCaptured = 'ScreenCaptured',
  SnapshotCreated = 'SnapshotCreated',
  ApplicationDetected = 'ApplicationDetected',
  WindowDetected = 'WindowDetected',
  ErrorDetected = 'ErrorDetected',
  ContextUpdated = 'ContextUpdated'
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
