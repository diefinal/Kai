import { VerificationResult } from './VerificationResult';

export type RetryPolicyType = 'retry_once' | 'retry_three' | 'abort' | 'ask_user' | 'replan';

export interface PolicyEvaluation {
  shouldRetry: boolean;
  shouldReplan: boolean;
  shouldAskUser: boolean;
  shouldAbort: boolean;
  maxRetries: number;
}

export class VerificationStrategy {
  static getMaxRetries(policy: RetryPolicyType): number {
    switch (policy) {
      case 'retry_once':
        return 1;
      case 'retry_three':
        return 3;
      case 'abort':
      case 'ask_user':
      case 'replan':
      default:
        return 0;
    }
  }

  static evaluatePolicy(
    policy: RetryPolicyType,
    currentRetries: number,
    result: VerificationResult
  ): PolicyEvaluation {
    if (result.success) {
      return {
        shouldRetry: false,
        shouldReplan: false,
        shouldAskUser: false,
        shouldAbort: false,
        maxRetries: 0,
      };
    }

    const maxRetries = this.getMaxRetries(policy);

    switch (policy) {
      case 'retry_once':
      case 'retry_three':
        if (currentRetries < maxRetries && result.retrySuggested) {
          return {
            shouldRetry: true,
            shouldReplan: false,
            shouldAskUser: false,
            shouldAbort: false,
            maxRetries,
          };
        }
        return {
          shouldRetry: false,
          shouldReplan: false,
          shouldAskUser: false,
          shouldAbort: true,
          maxRetries,
        };

      case 'replan':
        return {
          shouldRetry: false,
          shouldReplan: true,
          shouldAskUser: false,
          shouldAbort: false,
          maxRetries: 0,
        };

      case 'ask_user':
        return {
          shouldRetry: false,
          shouldReplan: false,
          shouldAskUser: true,
          shouldAbort: false,
          maxRetries: 0,
        };

      case 'abort':
      default:
        return {
          shouldRetry: false,
          shouldReplan: false,
          shouldAskUser: false,
          shouldAbort: true,
          maxRetries: 0,
        };
    }
  }
}

export function evaluatePolicy(
  result: VerificationResult,
  currentRetries: number = 0,
  policy: RetryPolicyType = 'retry_once'
): PolicyEvaluation {
  return VerificationStrategy.evaluatePolicy(policy, currentRetries, result);
}

