export interface IEventPublisher {
  publish(eventName: string, payload: any): void;
}
export interface IEventSubscriber {
  subscribe(eventName: string, handler: (payload: any) => void): void;
}
export interface IEventBus extends IEventPublisher, IEventSubscriber {}

export interface IScreenCaptureProvider {
  capture(): Promise<any>;
  generateHash(image: any): string;
}

export interface IOCRProvider {
  extractText(image: any): Promise<any[]>;
}

export interface IObjectDetectionProvider {
  detectObjects(image: any): Promise<any[]>;
}

export interface IWindowProvider {
  getActiveWindow(): Promise<any>;
}

export interface IDetector {
  name: string;
  detect(context: any): Promise<void>;
}

export interface ISnapshotCache {
  get(hash: string): any | null;
  set(hash: string, snapshot: any): void;
}
