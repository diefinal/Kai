import { Plan } from '../model/Plan';
import { PlanningContext } from './PlanningContext';
import { PlanningRule, defaultPlanningRules } from './PlanningRules';

export class PlanBuilder {
  constructor(private readonly rules: PlanningRule[] = defaultPlanningRules) {}

  build(context: PlanningContext): Plan {
    for (const rule of this.rules) {
      if (rule.matches(context)) {
        return {
          goal: context.goal,
          tasks: rule.generateTasks(context),
        };
      }
    }

    return {
      goal: context.goal,
      tasks: [],
    };
  }
}
