export class VisionSnapshot {
  application?: string;
  window?: string;
  focusedElement?: any;
  buttons: any[] = [];
  inputs: any[] = [];
  texts: string[] = [];
  tables: any[] = [];
  errors: any[] = [];
  dialogs: any[] = [];
  metadata: Record<string, any> = {};
  timestamp: number = Date.now();
}

export class VisionContext {
  public snapshot = new VisionSnapshot();
  public rawImage: any;
  public ocrResults: any[] = [];
  public objectResults: any[] = [];
  // Alias for snapshot.texts for compatibility with legacy detectors
  get texts(): string[] {
    return this.snapshot.texts;
  }
  set texts(value: string[]) {
    this.snapshot.texts = value;
  }

  constructor(public id: string) {}
}

export class VisionMetadata {
  // Placeholder for future metadata fields
  constructor(public data: Record<string, any> = {}) {}
}

export class VisionAnalysis {
  // Placeholder for analysis results, could include confidence scores etc.
  constructor(public snapshot: VisionSnapshot, public metadata: VisionMetadata) {}
}
