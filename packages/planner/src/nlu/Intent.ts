export interface Intent {
  name: string;
  confidence: number;
  parameters?: Record<string, unknown>;
}
