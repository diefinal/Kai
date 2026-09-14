import { AnalyzedGoal, StepCandidate } from './ReasoningTypes';

export class ActionSelector {
  selectActions(analyzed: AnalyzedGoal): StepCandidate[] {
    const candidates: StepCandidate[] = [];

    for (const subgoal of analyzed.subGoals) {
      switch (subgoal) {
        case 'ensure_browser_open':
          candidates.push({
            action: 'OPEN_APPLICATION',
            parameters: { target: analyzed.targetApp || 'chrome' },
            phase: 'precondition',
          });
          break;

        case 'navigate_github_login':
          candidates.push({
            action: 'NAVIGATE',
            parameters: {
              url: 'https://github.com/login',
              browser: analyzed.targetApp || 'chrome',
            },
            phase: 'precondition',
          });
          break;

        case 'find_login_input':
          candidates.push({
            action: 'QUERY_DOM',
            parameters: {
              tag: 'input',
              placeholder: 'Username or email address',
              name: 'login',
            },
            phase: 'execution',
          });
          break;

        case 'find_password_input':
          candidates.push({
            action: 'QUERY_DOM',
            parameters: {
              tag: 'input',
              type: 'password',
              name: 'password',
            },
            phase: 'execution',
          });
          break;

        case 'find_signin_button':
          candidates.push({
            action: 'QUERY_DOM',
            parameters: {
              role: 'button',
              text: 'Sign in',
            },
            phase: 'execution',
          });
          break;

        case 'navigate_pull_requests':
          candidates.push({
            action: 'NAVIGATE',
            parameters: {
              url: 'https://github.com/pulls',
              browser: analyzed.targetApp || 'chrome',
            },
            phase: 'precondition',
          });
          break;

        case 'select_latest_pr':
          candidates.push({
            action: 'QUERY_DOM',
            parameters: {
              selector: 'a[data-hovercard-type="pull_request"], .js-navigation-open',
              text: 'PR',
            },
            phase: 'execution',
          });
          break;

        case 'find_merge_button':
          candidates.push({
            action: 'QUERY_DOM',
            parameters: {
              role: 'button',
              text: 'Merge pull request',
            },
            phase: 'execution',
          });
          break;

        case 'confirm_merge_pr':
          candidates.push({
            action: 'MERGE_PR',
            parameters: {
              target: 'latest',
              confirm: true,
            },
            phase: 'execution',
            isSensitive: true,
            sensitivityReason: analyzed.sensitivityReason,
          });
          break;

        case 'ensure_app_running':
          if (analyzed.targetApp) {
            candidates.push({
              action: 'OPEN_APPLICATION',
              parameters: { target: analyzed.targetApp },
              phase: 'precondition',
            });
          }
          break;

        case 'navigate_target_url':
          if (analyzed.targetDomain) {
            candidates.push({
              action: 'NAVIGATE',
              parameters: { url: analyzed.targetDomain },
              phase: 'precondition',
            });
          }
          break;

        case 'type_text': {
          const doubleMatch = analyzed.rawGoal.match(/"([^"]+)"/);
          const singleMatch = analyzed.rawGoal.match(/'([^']+)'/);
          const text = doubleMatch ? doubleMatch[1] : singleMatch ? singleMatch[1] : 'Merhaba';
          candidates.push({
            action: 'TYPE_TEXT',
            parameters: { text },
            phase: 'execution',
          });
          break;
        }

        case 'delete_target': {
          const pathMatch = analyzed.rawGoal.match(/([a-zA-Z]:\\[^\s\n\r]+|\/[^\s\n\r]+)/);
          const path = pathMatch ? pathMatch[1] : 'target_file';
          candidates.push({
            action: 'DELETE_FILE',
            parameters: { path },
            phase: 'execution',
            isSensitive: true,
            sensitivityReason: analyzed.sensitivityReason,
          });
          break;
        }

        case 'close_target':
          candidates.push({
            action: 'CLOSE_WINDOW',
            parameters: { target: analyzed.targetApp || 'current' },
            phase: 'execution',
            isSensitive: true,
            sensitivityReason: analyzed.sensitivityReason,
          });
          break;

        default:
          candidates.push({
            action: analyzed.primaryAction,
            parameters: {},
            phase: 'execution',
            isSensitive: analyzed.isSensitive,
            sensitivityReason: analyzed.sensitivityReason,
          });
          break;
      }
    }

    return candidates;
  }
}
