import { ImageFrame } from '../image/ImageFrame';
import { OcrProvider, OcrResult } from './OcrProvider';
import { CapturePipeline } from '../capture/CapturePipeline';

export class OcrEngine {
  constructor(private readonly provider: OcrProvider) {}

  /**
   * Recognizes text in an ImageFrame directly.
   */
  async recognize(image: ImageFrame): Promise<OcrResult[]> {
    if (!image || !image.data || image.data.length === 0) {
      return [];
    }
    const results = await this.provider.recognize(image);
    return results.map((res) => ({
      ...res,
      confidence: Math.max(0, Math.min(1, res.confidence)),
    }));
  }

  /**
   * Connects to CapturePipeline: captures a frame and recognizes text.
   */
  async recognizeFromPipeline(pipeline: CapturePipeline): Promise<OcrResult[]> {
    const frame = await pipeline.capture();
    return this.recognize(frame);
  }
}
