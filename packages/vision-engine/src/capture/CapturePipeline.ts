import { ImageFrame } from '../image/ImageFrame';
import { CaptureSource } from './CaptureSource';

export class CapturePipeline {
  constructor(private readonly source: CaptureSource) {}

  async capture(): Promise<ImageFrame> {
    return this.source.capture();
  }
}
