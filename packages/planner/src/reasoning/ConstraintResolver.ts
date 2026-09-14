import { ReasoningContext, StepCandidate } from './ReasoningTypes';

export class ConstraintResolver {
  resolveConstraints(
    candidates: StepCandidate[],
    context?: ReasoningContext,
    language: 'tr' | 'en' = 'tr'
  ): {
    resolvedSteps: StepCandidate[];
    requiresConfirmation: boolean;
    confirmationMessage?: string;
  } {
    const resolvedSteps: StepCandidate[] = [];

    const isBrowserOpen = Boolean(
      context?.currentBrowser?.browserName ||
      context?.currentApplication === 'chrome' ||
      context?.currentApplication === 'edge'
    );
    const currentUrl = context?.currentBrowser?.currentUrl || '';

    const preferredBrowser = context?.preferredBrowser;

    for (const candidate of candidates) {
      // Preference: Apply user preferred browser if candidate opens default chrome
      if (
        candidate.action === 'OPEN_APPLICATION' &&
        candidate.parameters.target === 'chrome' &&
        preferredBrowser
      ) {
        candidate.parameters.target = preferredBrowser;
      }
      if (
        candidate.action === 'NAVIGATE' &&
        candidate.parameters.browser === 'chrome' &&
        preferredBrowser
      ) {
        candidate.parameters.browser = preferredBrowser;
      }

      // Constraint 1: Skip opening browser if already open
      if (
        candidate.action === 'OPEN_APPLICATION' &&
        (candidate.parameters.target === 'chrome' ||
          candidate.parameters.target === 'edge' ||
          candidate.parameters.target === preferredBrowser) &&
        isBrowserOpen
      ) {
        continue;
      }

      // Constraint 2: Skip navigation if already on target URL
      if (
        candidate.action === 'NAVIGATE' &&
        candidate.parameters.url &&
        typeof candidate.parameters.url === 'string' &&
        currentUrl.toLowerCase().includes(candidate.parameters.url.toLowerCase())
      ) {
        continue;
      }

      // Constraint 3: Skip opening target application if already active
      if (
        candidate.action === 'OPEN_APPLICATION' &&
        candidate.parameters.target &&
        context?.currentApplication === candidate.parameters.target
      ) {
        continue;
      }

      resolvedSteps.push(candidate);
    }

    // Evaluate Confirmation Rules
    const sensitiveStep = resolvedSteps.find((s) => s.isSensitive || this.isActionSensitive(s.action));
    const requiresConfirmation = Boolean(sensitiveStep);
    let confirmationMessage: string | undefined;

    if (sensitiveStep) {
      confirmationMessage =
        sensitiveStep.sensitivityReason ||
        this.buildConfirmationMessage(sensitiveStep, language);
    }

    return {
      resolvedSteps,
      requiresConfirmation,
      confirmationMessage,
    };
  }

  private isActionSensitive(action: string): boolean {
    const sensitiveActions = [
      'DELETE_FILE',
      'DELETE_FOLDER',
      'REMOVE_PATH',
      'SEND_EMAIL',
      'SEND_MAIL',
      'MERGE_PR',
      'MERGE_PULL_REQUEST',
      'CLOSE_APPLICATION',
      'QUIT_APP',
      'KILL_PROCESS',
      'GIT_COMMIT',
      'GIT_PUSH',
      'GIT_RESET',
      'GIT_REBASE',
    ];
    return sensitiveActions.includes(action.toUpperCase());
  }

  private buildConfirmationMessage(step: StepCandidate, language: 'tr' | 'en'): string {
    const action = step.action.toUpperCase();

    if (action.includes('DELETE')) {
      const path = (step.parameters.path as string) || 'dosya';
      return language === 'tr'
        ? `"${path}" öğesini kalıcı olarak silmek istediğinizden emin misiniz?`
        : `Are you sure you want to permanently delete "${path}"?`;
    }

    if (action.includes('MERGE')) {
      return language === 'tr'
        ? 'Pull request birleştirmesini onaylıyor musunuz?'
        : 'Do you confirm merging this pull request?';
    }

    if (action.includes('EMAIL') || action.includes('MAIL')) {
      return language === 'tr'
        ? 'E-postayı göndermek istediğinize emin misiniz?'
        : 'Are you sure you want to send this email?';
    }

    if (action.includes('CLOSE') || action.includes('QUIT') || action.includes('KILL')) {
      const app = (step.parameters.target as string) || 'uygulama';
      return language === 'tr'
        ? `"${app}" uygulamasını kapatmak istediğinize emin misiniz?`
        : `Are you sure you want to close "${app}"?`;
    }

    if (action.includes('GIT')) {
      return language === 'tr'
        ? 'Depoda kalıcı değişiklik yapmayı onaylıyor musunuz?'
        : 'Do you confirm modifying repository state?';
    }

    return language === 'tr'
      ? 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?'
      : 'Are you sure you want to proceed with this action?';
  }
}
