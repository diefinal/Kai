import { Goal } from './Goal';
import { Task } from './Task';

export interface Plan {
  goal: Goal;
  tasks: Task[];
}
