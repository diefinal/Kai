import { IEventBus } from '../interfaces';
import { EventEmitter } from 'events';

export enum ToolEventTypes {
  ToolRegistered = 'ToolRegistered',
  ToolLoaded = 'ToolLoaded',
  ToolResolved = 'ToolResolved',
  ToolExecuted = 'ToolExecuted',
  ToolFailed = 'ToolFailed'
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
