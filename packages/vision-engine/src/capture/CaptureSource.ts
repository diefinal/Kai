import { ImageFrame } from '../image/ImageFrame';

export interface ScreenCaptureData {
  width: number;
  height: number;
  timestamp: number;
  image: Uint8Array;
}

export interface IScreenCaptureSource {
  captureScreen(): Promise<ScreenCaptureData>;
}

export interface CaptureSource {
  capture(): Promise<ImageFrame>;
}

/**
 * Adapter that consumes a screen capture source (such as Windows Engine ScreenCaptureManager)
 * and converts ScreenCapture data into an ImageFrame without duplicating buffers.
 */
export class ScreenCaptureSourceAdapter implements CaptureSource {
  constructor(private readonly source: IScreenCaptureSource) {}

  async capture(): Promise<ImageFrame> {
    const screenCapture = await this.source.captureScreen();
    return {
      width: screenCapture.width,
      height: screenCapture.height,
      channels: 4, // Default RGBA
      timestamp: screenCapture.timestamp,
      data: screenCapture.image, // Directly reuse the buffer without duplication
    };
  }
}
