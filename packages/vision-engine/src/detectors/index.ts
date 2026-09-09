import { IDetector } from '../interfaces';
import { VisionContext } from '../models';

/** Application detector – mock logic */
export class ApplicationDetector implements IDetector {
  name = 'ApplicationDetector';
  async detect(context: VisionContext): Promise<void> {
    if (context.rawImage === 'IDE_IMAGE') {
      context.snapshot.application = 'VS Code';
    }
  }
}

/** Window detector – mock logic */
export class WindowDetector implements IDetector {
  name = 'WindowDetector';
  async detect(context: VisionContext): Promise<void> {
    if (typeof context.rawImage === 'string' && context.rawImage.startsWith('WINDOW_')) {
      context.snapshot.window = context.rawImage.replace('WINDOW_', '');
    }
  }
}

/** Button detector – mock logic */
export class ButtonDetector implements IDetector {
  name = 'ButtonDetector';
  async detect(context: VisionContext): Promise<void> {
    if (typeof context.rawImage === 'string' && context.rawImage.includes('BUTTON')) {
      context.snapshot.buttons.push({ label: 'OK', id: 'btn-ok' });
    }
  }
}

/** Text detector – mock logic */
export class TextDetector implements IDetector {
  name = 'TextDetector';
  async detect(context: VisionContext): Promise<void> {
    if (typeof context.rawImage === 'string' && context.rawImage.includes('TEXT')) {
      context.snapshot.texts.push(context.rawImage);
    }
  }
}

/** Browser detector – mock logic */
export class BrowserDetector implements IDetector {
  name = 'BrowserDetector';
  async detect(context: VisionContext): Promise<void> {
    if (typeof context.rawImage === 'string' && context.rawImage.includes('BROWSER')) {
      context.snapshot.application = 'Browser';
    }
  }
}

/** IDE detector – mock logic */
export class IDEDetector implements IDetector {
  name = 'IDEDetector';
  async detect(context: VisionContext): Promise<void> {
    if (typeof context.rawImage === 'string' && context.rawImage.includes('IDE')) {
      context.snapshot.application = 'IDE';
    }
  }
}

/** Dialog detector – mock logic */
export class DialogDetector implements IDetector {
  name = 'DialogDetector';
  async detect(context: VisionContext): Promise<void> {
    if (typeof context.rawImage === 'string' && context.rawImage.includes('DIALOG')) {
      context.snapshot.dialogs.push({ type: 'alert', message: 'Test dialog' });
    }
  }
}

/** Error detector – mock logic */
export class ErrorDetector implements IDetector {
  name = 'ErrorDetector';
  async detect(context: VisionContext): Promise<void> {
    if (context.snapshot.texts.includes('Exception')) {
      context.snapshot.errors.push('Exception detected on screen');
    }
  }
}
