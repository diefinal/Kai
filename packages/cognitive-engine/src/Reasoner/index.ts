export class Reasoner {
  analyze(input: string, context: any) {
    return { intent: 'UNKNOWN', context, goal: null };
  }
}
