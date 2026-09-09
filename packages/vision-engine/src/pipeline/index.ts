import { IDetector, IScreenCaptureProvider, IEventBus, ISnapshotCache } from '../interfaces';
import { VisionContext, VisionSnapshot } from '../models';
import { VisionEventTypes } from '../events';

/**
 * VisionPipeline orchestrates the full analysis flow.
 * Stages are executed in a strict order. Each stage may emit events.
 */
export class VisionPipeline {
  private detectors: IDetector[] = [];
  private captureProvider!: IScreenCaptureProvider;

  constructor(
    private readonly eventBus: IEventBus,
    private readonly cache: ISnapshotCache,
  ) {}

  /** Register the capture provider (required). */
  setCaptureProvider(provider: IScreenCaptureProvider): void {
    this.captureProvider = provider;
  }

  /** Register a detector. Order of registration defines execution order. */
  addDetector(detector: IDetector): void {
    this.detectors.push(detector);
  }

  /** Execute the full pipeline and return the final snapshot. */
  async runAnalysis(): Promise<VisionSnapshot> {
    if (!this.captureProvider) {
      throw new Error('CaptureProvider not configured');
    }

    // ---------- Capture ----------
    const rawImage = await this.captureProvider.capture();
    const hash = this.captureProvider.generateHash(rawImage);
    this.eventBus.publish(VisionEventTypes.ScreenCaptured, { hash });

    // ---------- Cache ----------
    const cached = this.cache.get(hash);
    if (cached) {
      return cached;
    }

    // ---------- Context creation ----------
    const context = new VisionContext(hash);
    context.rawImage = rawImage;

    // ---------- PreProcess (noop for now) ----------
    // Future preprocessing steps could be added here.

    // ---------- Detection stages ----------
    for (const detector of this.detectors) {
      await detector.detect(context);

      // Emit stage‑specific events based on detector name.
      switch (detector.name) {
        case 'ApplicationDetector':
          if (context.snapshot.application) {
            this.eventBus.publish(VisionEventTypes.ApplicationDetected, {
              application: context.snapshot.application,
            });
          }
          break;
        case 'WindowDetector':
          if (context.snapshot.window) {
            this.eventBus.publish(VisionEventTypes.WindowDetected, {
              window: context.snapshot.window,
            });
          }
          break;
        case 'ErrorDetector':
          if (context.snapshot.errors.length > 0) {
            this.eventBus.publish(VisionEventTypes.ErrorDetected, {
              errors: context.snapshot.errors,
            });
          }
          break;
        default:
          // No dedicated event for other detectors.
          break;
      }
    }

    // ---------- Context Updated ----------
    this.eventBus.publish(VisionEventTypes.ContextUpdated, { id: context.id });

    // ---------- Snapshot Creation & Publishing ----------
    const finalSnapshot = context.snapshot;
    this.cache.set(hash, finalSnapshot);
    this.eventBus.publish(VisionEventTypes.SnapshotCreated, {
      hash,
      snapshot: finalSnapshot,
    });

    return finalSnapshot;
  }
}
