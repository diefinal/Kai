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
  
  constructor(public id: string) {}
}
