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
    if (context.snapshot.texts.includes('Exception')) {
      context.snapshot.errors.push('Exception detected on screen');
    }
  }
}
