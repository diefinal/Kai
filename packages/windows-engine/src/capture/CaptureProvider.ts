import { ScreenCapture } from './ScreenCapture';

export interface CaptureProvider {
  captureScreen(): Promise<ScreenCapture>;
}

export class ScreenCaptureManager {
  constructor(private readonly provider: CaptureProvider) {}

  async captureScreen(): Promise<ScreenCapture> {
    return this.provider.captureScreen();
  }
}
