export interface VerificationResult {
  success: boolean;
  confidence: number;
  reason?: string;
  retrySuggested: boolean;
}
