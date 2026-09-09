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
