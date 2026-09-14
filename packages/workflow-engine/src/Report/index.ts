export interface WorkflowReportData {
  goal: string;
  success: boolean;
  filesChanged: number;
  bugsFixed: number;
  testsPassed: number;
  buildStatus: 'successful' | 'failed';
  summaryMessage: string;
}

export class ReportGenerator {
  public generateReport(data: WorkflowReportData): string {
    return [
      data.success ? 'Completed' : 'Failed',
      data.filesChanged + ' files changed',
      data.bugsFixed + ' bugs fixed',
      data.testsPassed + ' tests passed',
      'Build ' + data.buildStatus,
      data.summaryMessage
    ].join('\n');
  }
}
