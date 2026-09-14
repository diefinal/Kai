import { AnalyzedGoal, GoalCategory } from './ReasoningTypes';

export class GoalAnalyzer {
  analyze(rawGoal: string): AnalyzedGoal {
    const trimmed = rawGoal.trim();
    const lower = trimmed.toLowerCase();
    const lang = this.detectLanguage(lower);

    const category = this.detectCategory(lower);
    const targetApp = this.detectTargetApp(lower);
    const targetDomain = this.detectTargetDomain(lower);
    const { isSensitive, sensitivityReason } = this.checkSensitivity(lower, lang);
    const subGoals = this.generateSubGoals(lower, category, targetDomain, targetApp);

    const primaryAction = this.detectPrimaryAction(lower, subGoals);

    return {
      rawGoal: trimmed,
      category,
      primaryAction,
      subGoals,
      targetApp,
      targetDomain,
      isSensitive,
      sensitivityReason,
      language: lang,
    };
  }

  private detectLanguage(lower: string): 'tr' | 'en' {
    if (/[çğıöşü]/i.test(lower)) return 'tr';
    const trWords = [
      'aç', 'kapat', 'git', 'bul', 'sil', 'yaz', 'et', 'giriş', 'yap',
      'kaç', 'var', 'mı', 'mi', 'mu', 'mü', 'oku', 'gönder', 'sayfa', 'buton', 'son'
    ];
    const words = lower.split(/\s+/).map((w) => w.replace(/[.,?!:;'"()-]/g, ''));
    return words.some((w) => trWords.includes(w)) ? 'tr' : 'en';
  }

  private detectCategory(lower: string): GoalCategory {
    if (
      lower.includes('github') ||
      lower.includes('pr') ||
      lower.includes('pull request') ||
      lower.includes('git ') ||
      lower.includes('commit')
    ) {
      return 'coding';
    }
    if (
      lower.includes('browser') ||
      lower.includes('chrome') ||
      lower.includes('edge') ||
      lower.includes('sekme') ||
      lower.includes('tab') ||
      lower.includes('sayfa') ||
      lower.includes('page') ||
      lower.includes('web') ||
      lower.includes('url') ||
      lower.includes('http') ||
      lower.includes('.com')
    ) {
      return 'browser';
    }
    if (
      lower.includes('notepad') ||
      lower.includes('not defteri') ||
      lower.includes('vs code') ||
      lower.includes('vscode') ||
      lower.includes('explorer') ||
      lower.includes('pencere') ||
      lower.includes('window') ||
      lower.includes('uygulama') ||
      lower.includes('app')
    ) {
      return 'desktop';
    }
    if (
      lower.includes('sil') ||
      lower.includes('delete') ||
      lower.includes('dosya') ||
      lower.includes('file') ||
      lower.includes('email') ||
      lower.includes('mail')
    ) {
      return 'system';
    }
    return 'general';
  }

  private detectTargetApp(lower: string): string | undefined {
    if (lower.includes('chrome')) return 'chrome';
    if (lower.includes('edge')) return 'edge';
    if (lower.includes('vscode') || lower.includes('vs code') || lower.includes('visual studio code')) return 'vscode';
    if (lower.includes('notepad') || lower.includes('not defteri')) return 'notepad';
    if (lower.includes('explorer') || lower.includes('dosya gezgini')) return 'explorer';
    if (lower.includes('github') || lower.includes('pr')) return 'chrome'; // Default web tool
    return undefined;
  }

  private detectTargetDomain(lower: string): string | undefined {
    if (lower.includes('github')) return 'https://github.com';
    if (lower.includes('google')) return 'https://google.com';
    if (lower.includes('youtube')) return 'https://youtube.com';
    const match = lower.match(/\b([a-zA-Z0-9-]+\.(com|org|net|io|dev|ai))\b/i);
    if (match) return `https://${match[1]}`;
    return undefined;
  }

  private checkSensitivity(
    lower: string,
    lang: 'tr' | 'en'
  ): { isSensitive: boolean; sensitivityReason?: string } {
    // 1. Deleting files / folders
    if (
      (lower.includes('sil') || lower.includes('delete') || lower.includes('remove')) &&
      (lower.includes('dosya') || lower.includes('file') || lower.includes('klasör') || lower.includes('folder') || /:[\\/]/.test(lower))
    ) {
      return {
        isSensitive: true,
        sensitivityReason:
          lang === 'tr'
            ? 'Dosya veya klasör silme işlemi onay gerektirir.'
            : 'Deleting files or folders requires confirmation.',
      };
    }

    // 2. Sending emails
    if (
      (lower.includes('email') || lower.includes('mail') || lower.includes('e-posta')) &&
      (lower.includes('gönder') || lower.includes('send') || lower.includes('at'))
    ) {
      return {
        isSensitive: true,
        sensitivityReason:
          lang === 'tr'
            ? 'E-posta gönderme işlemi onay gerektirir.'
            : 'Sending emails requires confirmation.',
      };
    }

    // 3. Merging PRs
    if (
      lower.includes('merge') &&
      (lower.includes('pr') || lower.includes('pull request') || lower.includes('dal'))
    ) {
      return {
        isSensitive: true,
        sensitivityReason:
          lang === 'tr'
            ? 'Pull request birleştirme (merge) işlemi onay gerektirir.'
            : 'Merging pull requests requires confirmation.',
      };
    }

    // 4. Closing applications
    if (
      (lower.includes('kapat') || lower.includes('close') || lower.includes('quit') || lower.includes('kill')) &&
      (lower.includes('uygulama') || lower.includes('app') || lower.includes('chrome') || lower.includes('vscode') || lower.includes('notepad'))
    ) {
      return {
        isSensitive: true,
        sensitivityReason:
          lang === 'tr'
            ? 'Uygulamayı kapatma işlemi onay gerektirir.'
            : 'Closing applications requires confirmation.',
      };
    }

    // 5. Modifying repositories
    if (
      lower.includes('git commit') ||
      lower.includes('git push') ||
      lower.includes('git reset') ||
      lower.includes('git rebase') ||
      (lower.includes('commit') && lower.includes('yap')) ||
      (lower.includes('push') && lower.includes('et'))
    ) {
      return {
        isSensitive: true,
        sensitivityReason:
          lang === 'tr'
            ? 'Depo (repository) üzerinde kalıcı değişiklik yapma işlemi onay gerektirir.'
            : 'Modifying repository state requires confirmation.',
      };
    }

    return { isSensitive: false };
  }

  private generateSubGoals(
    lower: string,
    category: GoalCategory,
    domain?: string,
    app?: string
  ): string[] {
    const subGoals: string[] = [];

    // Special workflow: GitHub Login
    if (
      (lower.includes('github') || domain === 'https://github.com') &&
      (lower.includes('giriş') || lower.includes('login') || lower.includes('sign in'))
    ) {
      return [
        'ensure_browser_open',
        'navigate_github_login',
        'find_login_input',
        'find_password_input',
        'find_signin_button',
      ];
    }

    // Special workflow: Merge latest PR
    if (lower.includes('merge') && (lower.includes('pr') || lower.includes('pull request'))) {
      return [
        'ensure_browser_open',
        'navigate_pull_requests',
        'select_latest_pr',
        'find_merge_button',
        'confirm_merge_pr',
      ];
    }

    // Standard workflows
    if (app) {
      subGoals.push('ensure_app_running');
    } else if (domain) {
      subGoals.push('ensure_browser_open');
      subGoals.push('navigate_target_url');
    }

    if (lower.includes('yaz') || lower.includes('type')) {
      subGoals.push('type_text');
    }

    if (lower.includes('sil') || lower.includes('delete')) {
      subGoals.push('delete_target');
    }

    if (lower.includes('kapat') || lower.includes('close')) {
      subGoals.push('close_target');
    }

    if (subGoals.length === 0) {
      subGoals.push('execute_generic_goal');
    }

    return subGoals;
  }

  private detectPrimaryAction(lower: string, subGoals: string[]): string {
    if (subGoals.includes('confirm_merge_pr')) return 'MERGE_PR';
    if (subGoals.includes('find_signin_button')) return 'LOGIN_WORKFLOW';
    if (subGoals.includes('delete_target')) return 'DELETE_FILE';
    if (subGoals.includes('close_target')) return 'CLOSE_WINDOW';
    if (subGoals.includes('type_text')) return 'TYPE_TEXT';
    if (subGoals.includes('navigate_target_url')) return 'NAVIGATE';
    if (subGoals.includes('ensure_app_running')) return 'OPEN_APPLICATION';
    return 'GENERIC_ACTION';
  }
}
