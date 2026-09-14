import { VerificationContext } from './VerificationContext';
import { VerificationResult } from './VerificationResult';
import { PolicyEvaluation, RetryPolicyType, VerificationStrategy } from './VerificationStrategy';
import {
  BrowserVerifier,
  DefaultVerifier,
  DesktopVerifier,
  IVerifier,
  VisionVerifier,
} from './ExecutionVerifier';

export interface VerificationEngineOptions {
  verifiers?: IVerifier[];
  defaultTimeoutMs?: number;
}

export class VerificationEngine {
  private readonly verifiers: IVerifier[] = [];
  private readonly defaultTimeoutMs: number;

  constructor(options: VerificationEngineOptions = {}) {
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 5000;

    if (options.verifiers && options.verifiers.length > 0) {
      this.verifiers.push(...options.verifiers);
    } else {
      // Default verifier chain
      this.verifiers.push(
        new BrowserVerifier(),
        new DesktopVerifier(),
        new VisionVerifier(),
        new DefaultVerifier()
      );
    }
  }

  registerVerifier(verifier: IVerifier, prepend = true): void {
    if (prepend) {
      this.verifiers.unshift(verifier);
    } else {
      this.verifiers.push(verifier);
    }
  }

  async verify(
    context: VerificationContext,
    timeoutMs?: number
  ): Promise<VerificationResult> {
    const timeout = timeoutMs ?? this.defaultTimeoutMs;

    const timeoutPromise = new Promise<VerificationResult>((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          confidence: 0.8,
          reason: `Verification timed out after ${timeout}ms.`,
          retrySuggested: true,
        });
      }, timeout);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    const executionPromise = this.performVerification(context);
    return Promise.race([executionPromise, timeoutPromise]);
  }

  private async performVerification(context: VerificationContext): Promise<VerificationResult> {
    // 1. Check custom verification check if provided
    if (context.customCheck) {
      try {
        const customRes = await context.customCheck(context);
        if (typeof customRes === 'boolean') {
          return {
            success: customRes,
            confidence: customRes ? 1.0 : 0.0,
            reason: customRes ? undefined : 'Custom verification check failed.',
            retrySuggested: !customRes,
          };
        }

        return customRes;
      } catch (err: any) {
        return {
          success: false,
          confidence: 0.9,
          reason: `Custom check threw an exception: ${err?.message || err}`,
          retrySuggested: true,
        };
      }
    }

    // 2. Select appropriate domain verifier
    for (const verifier of this.verifiers) {
      if (verifier.canVerify(context.action)) {
        return verifier.verify(context);
      }
    }

    return new DefaultVerifier().verify(context);
  }

  evaluatePolicy(
    result: VerificationResult,
    currentRetries = 0,
    policy: RetryPolicyType = 'retry_once'
  ): PolicyEvaluation {
    return VerificationStrategy.evaluatePolicy(policy, currentRetries, result);
  }
}
