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
