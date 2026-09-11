import { Intent } from './Intent';

export interface IntentScore {
  intent: Intent;
  matchedPattern?: string;
}
