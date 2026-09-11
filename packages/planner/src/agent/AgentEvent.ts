import { AgentState } from './AgentState';

export interface AgentEvent {
  timestamp: number;
  state: AgentState;
  message: string;
}

export type AgentEventListener = (event: AgentEvent) => void;
