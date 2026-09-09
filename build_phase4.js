const fs = require('fs');
const path = require('path');

const rootDir = path.join('d:/Kai', 'packages', 'vision-engine');

const dirs = [
  'src/interfaces',
  'src/events',
  'src/models',
  'src/providers',
  'src/detectors',
  'src/cache',
  'src/pipeline',
  'src/core',
  'tests'
];

dirs.forEach(d => fs.mkdirSync(path.join(rootDir, d), { recursive: true }));

const writeFile = (filePath, content) => {
  fs.writeFileSync(path.join(rootDir, filePath), content.trim() + '\n');
};

// ---------------------------------------------------------
// 1. INTERFACES
// ---------------------------------------------------------
writeFile('src/interfaces/index.ts', `
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
`);

// ---------------------------------------------------------
// 2. EVENTS
// ---------------------------------------------------------
writeFile('src/events/index.ts', `
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
`);

// ---------------------------------------------------------
// 3. MODELS
// ---------------------------------------------------------
writeFile('src/models/index.ts', `
export class VisionSnapshot {
  application?: string;
  window?: string;
  focusedElement?: any;
  buttons: any[] = [];
  inputs: any[] = [];
  texts: string[] = [];
  tables: any[] = [];
  errors: any[] = [];
  dialogs: any[] = [];
  metadata: Record<string, any> = {};
  timestamp: number = Date.now();
}

export class VisionContext {
  public snapshot = new VisionSnapshot();
  public rawImage: any;
  public ocrResults: any[] = [];
  public objectResults: any[] = [];
  
  constructor(public id: string) {}
}
`);

// ---------------------------------------------------------
// 4. CACHE
// ---------------------------------------------------------
writeFile('src/cache/index.ts', `
import { ISnapshotCache } from '../interfaces';

export class SnapshotCache implements ISnapshotCache {
  private store = new Map<string, any>();

  get(hash: string): any | null {
    return this.store.get(hash) || null;
  }

  set(hash: string, snapshot: any): void {
    this.store.set(hash, snapshot);
  }
}
`);

// ---------------------------------------------------------
// 5. DETECTORS
// ---------------------------------------------------------
writeFile('src/detectors/index.ts', `
import { IDetector } from '../interfaces';
import { VisionContext } from '../models';

export class ApplicationDetector implements IDetector {
  name = 'ApplicationDetector';
  async detect(context: VisionContext): Promise<void> {
    // Mock logic
    if (context.rawImage === 'IDE_IMAGE') {
      context.snapshot.application = 'VS Code';
    }
  }
}

export class ErrorDetector implements IDetector {
  name = 'ErrorDetector';
  async detect(context: VisionContext): Promise<void> {
    // Mock logic
    if (context.texts.includes('Exception')) {
      context.snapshot.errors.push('Exception detected on screen');
    }
  }
}
`);

// ---------------------------------------------------------
// 6. PIPELINE
// ---------------------------------------------------------
writeFile('src/pipeline/index.ts', `
import { IDetector, IScreenCaptureProvider, IEventBus, ISnapshotCache } from '../interfaces';
import { VisionContext, VisionSnapshot } from '../models';
import { VisionEventTypes } from '../events';

export class VisionPipeline {
  private detectors: IDetector[] = [];
  private captureProvider!: IScreenCaptureProvider;

  constructor(
    private eventBus: IEventBus,
    private cache: ISnapshotCache
  ) {}

  setCaptureProvider(provider: IScreenCaptureProvider) {
    this.captureProvider = provider;
  }

  addDetector(detector: IDetector) {
    this.detectors.push(detector);
  }

  async runAnalysis(): Promise<VisionSnapshot> {
    if (!this.captureProvider) throw new Error('CaptureProvider not configured');

    // 1. Capture
    const rawImage = await this.captureProvider.capture();
    const hash = this.captureProvider.generateHash(rawImage);
    
    // Check Cache
    const cached = this.cache.get(hash);
    if (cached) {
      return cached;
    }

    this.eventBus.publish(VisionEventTypes.ScreenCaptured, { hash });

    const context = new VisionContext(hash);
    context.rawImage = rawImage;

    // 2. Preprocess & Detect (Run Detectors sequentially for now, could be parallel or graph-based)
    for (const detector of this.detectors) {
      await detector.detect(context);
      
      // Emit specific events based on detector name as a generic example
      if (detector.name === 'ApplicationDetector' && context.snapshot.application) {
         this.eventBus.publish(VisionEventTypes.ApplicationDetected, { app: context.snapshot.application });
      }
      if (detector.name === 'ErrorDetector' && context.snapshot.errors.length > 0) {
         this.eventBus.publish(VisionEventTypes.ErrorDetected, { errors: context.snapshot.errors });
      }
    }

    this.eventBus.publish(VisionEventTypes.ContextUpdated, { id: context.id });

    // 3. Create Snapshot & Publish
    const finalSnapshot = context.snapshot;
    this.cache.set(hash, finalSnapshot);
    this.eventBus.publish(VisionEventTypes.SnapshotCreated, { hash, snapshot: finalSnapshot });

    return finalSnapshot;
  }
}
`);

// ---------------------------------------------------------
// 7. CORE
// ---------------------------------------------------------
writeFile('src/core/index.ts', `
import { IEventBus, IScreenCaptureProvider, IOCRProvider, IObjectDetectionProvider, IWindowProvider } from '../interfaces';
import { VisionPipeline } from '../pipeline';
import { SnapshotCache } from '../cache';

export class VisionManager {
  public pipeline: VisionPipeline;
  public cache: SnapshotCache;
  
  private ocrProvider?: IOCRProvider;
  private objectProvider?: IObjectDetectionProvider;
  private windowProvider?: IWindowProvider;

  constructor(private eventBus: IEventBus) {
    this.cache = new SnapshotCache();
    this.pipeline = new VisionPipeline(this.eventBus, this.cache);
  }

  setCaptureProvider(provider: IScreenCaptureProvider) {
    this.pipeline.setCaptureProvider(provider);
  }

  setOCRProvider(provider: IOCRProvider) {
    this.ocrProvider = provider;
  }

  setObjectDetectionProvider(provider: IObjectDetectionProvider) {
    this.objectProvider = provider;
  }
  
  setWindowProvider(provider: IWindowProvider) {
    this.windowProvider = provider;
  }

  async analyze(): Promise<any> {
    return this.pipeline.runAnalysis();
  }
}
`);

// ---------------------------------------------------------
// 8. EXPORT INDEX
// ---------------------------------------------------------
writeFile('src/index.ts', `
export * from './interfaces';
export * from './events';
export * from './models';
export * from './cache';
export * from './detectors';
export * from './pipeline';
export * from './core';
`);

// ---------------------------------------------------------
// 9. TESTS
// ---------------------------------------------------------
writeFile('tests/vision-engine.spec.ts', `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  VisionManager, 
  EventBus, 
  VisionEventTypes,
  ApplicationDetector,
  ErrorDetector
} from '../src';

class MockCaptureProvider {
  constructor(private imageId: string) {}
  async capture() { return this.imageId; }
  generateHash(image: any) { return 'hash-' + image; }
}

describe('Vision Engine Core', () => {
  let eventBus: EventBus;
  let manager: VisionManager;
  let events: any[] = [];
  
  beforeEach(() => {
    eventBus = new EventBus();
    events = [];
    Object.values(VisionEventTypes).forEach(type => {
      eventBus.subscribe(type, (payload) => events.push({ type, payload }));
    });
    
    manager = new VisionManager(eventBus);
    manager.setCaptureProvider(new MockCaptureProvider('IDE_IMAGE'));
    
    // Add detectors
    manager.pipeline.addDetector(new ApplicationDetector());
    manager.pipeline.addDetector(new ErrorDetector());
  });

  it('Pipeline runs sequentially and creates snapshot', async () => {
    const snapshot = await manager.analyze();
    
    expect(snapshot).toBeDefined();
    expect(snapshot.application).toBe('VS Code');
    
    const eventNames = events.map(e => e.type);
    expect(eventNames).toContain(VisionEventTypes.ScreenCaptured);
    expect(eventNames).toContain(VisionEventTypes.ApplicationDetected);
    expect(eventNames).toContain(VisionEventTypes.ContextUpdated);
    expect(eventNames).toContain(VisionEventTypes.SnapshotCreated);
  });

  it('Cache prevents re-analysis', async () => {
    const snapshot1 = await manager.analyze();
    events = []; // clear events
    
    const snapshot2 = await manager.analyze();
    
    // Should be exactly the same object from cache
    expect(snapshot1).toBe(snapshot2);
    // Events shouldn't fire again because of cache hit
    expect(events.length).toBe(0);
  });

  it('Provider can be swapped via configuration', async () => {
    manager.setCaptureProvider(new MockCaptureProvider('CHROME_IMAGE'));
    const snapshot = await manager.analyze();
    
    expect(snapshot.application).toBeUndefined(); // ApplicationDetector mock doesn't set for CHROME_IMAGE
    const eventNames = events.map(e => e.type);
    expect(eventNames).toContain(VisionEventTypes.ScreenCaptured);
  });
  
  it('Detectors work independently and populate snapshot', async () => {
    // Modify detector logic via context directly for test
    const customDetector = {
      name: 'CustomErrorDetector',
      async detect(ctx: any) {
         ctx.texts.push('Exception');
      }
    };
    
    // Reset manager to ensure clean state
    manager = new VisionManager(eventBus);
    manager.setCaptureProvider(new MockCaptureProvider('ERROR_SCREEN'));
    manager.pipeline.addDetector(customDetector);
    manager.pipeline.addDetector(new ErrorDetector());
    
    const snapshot = await manager.analyze();
    expect(snapshot.errors).toContain('Exception detected on screen');
    
    const errorEvent = events.find(e => e.type === VisionEventTypes.ErrorDetected);
    expect(errorEvent).toBeDefined();
    expect(errorEvent.payload.errors).toContain('Exception detected on screen');
  });
});
`);
