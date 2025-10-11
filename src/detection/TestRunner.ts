import * as vscode from 'vscode';
import { ActivityDetector } from './ActivityDetector.js';

export class TestRunnerIntegration {
  private testRunCount: number = 0;
  private lastTestTime: number = 0;

  constructor(
    private activityDetector: ActivityDetector,
    private onTestResult: (passed: boolean, testCount: number) => void
  ) {
    this.setupTestListeners();
  }

  private setupTestListeners() {
    // Listen for test runs
    (vscode as any).test.onDidChangeTestRunResults((event: any) => {
      this.testRunCount++;
      this.lastTestTime = Date.now();

      let passedTests = 0;
      let failedTests = 0;

      event.results.forEach(result => {
        if (result.state === (vscode as any).TestResultState.Passed) {
          passedTests++;
        } else if (result.state === (vscode as any).TestResultState.Failed) {
          failedTests++;
        }
      });

      const allPassed = failedTests === 0 && passedTests > 0;

      console.log(`🧪 Tests: ${passedTests} passed, ${failedTests} failed`);

      // Trigger state change in activity detector
      this.activityDetector.manualStateChange(
        allPassed ? 'test_passed' : 'test_failed'
      );

      // Notify callback
      this.onTestResult(allPassed, passedTests + failedTests);

      // Auto-reset to productive after 3 seconds
      setTimeout(() => {
        this.activityDetector.manualStateChange('productive');
      }, 3000);
    });

    // Detect when tests are running (before results)
    (vscode as any).test.onDidStartTestRun((run: any) => {
      console.log('🧪 Test run started');
      this.activityDetector.manualStateChange('testing');
    });
  }

  public getTestRunCount(): number {
    return this.testRunCount;
  }

  public getLastTestTime(): number {
    return this.lastTestTime;
  }
}