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
