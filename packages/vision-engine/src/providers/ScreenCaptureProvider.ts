import { IScreenCaptureProvider } from '../interfaces';

/**
 * Stub implementation of a screen capture provider.
 * The `capture` method returns a supplied identifier (string) for testing.
 */
export class StubScreenCaptureProvider implements IScreenCaptureProvider {
  constructor(private readonly imageId: string) {}

  async capture(): Promise<any> {
    // In a real implementation this would capture the screen and return image data.
    return this.imageId;
  }

  generateHash(image: any): string {
    // Simple deterministic hash for testability.
    return `hash-${String(image)}`;
  }
}
