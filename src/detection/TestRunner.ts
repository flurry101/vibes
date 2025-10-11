import * as vscode from 'vscode';
import { ActivityDetector } from './activityDetector.js';

export class TestRunner {
  private detector: ActivityDetector;
  private testRunning: boolean = false;

  constructor(detector: ActivityDetector) {
    this.detector = detector;
    this.setupTestWatcher();
  }

  private setupTestWatcher(): void {
    // Watch for test runs in the terminal
    vscode.window.onDidOpenTerminal(terminal => {
      console.log('Terminal opened:', terminal.name);
    });

    // Watch for test output
    vscode.window.onDidWriteTerminalData(event => {
      const data = event.data.toLowerCase();
      
      if (data.includes('test') && data.includes('running')) {
        this.onTestStart();
      }
      
      if (data.includes('passed') || data.includes('✓')) {
        this.onTestPass();
      }
      
      if (data.includes('failed') || data.includes('✗')) {
        this.onTestFail();
      }
    });
  }

  private onTestStart(): void {
    console.log('Test run started');
    this.testRunning = true;
    this.detector.onTestRun(false); // Set to testing state
  }

  private onTestPass(): void {
    if (this.testRunning) {
      console.log('Tests passed!');
      this.detector.onTestRun(true);
      this.testRunning = false;
    }
  }

  private onTestFail(): void {
    if (this.testRunning) {
      console.log('Tests failed!');
      this.detector.onTestRun(false);
      this.testRunning = false;
    }
  }

  isTestRunning(): boolean {
    return this.testRunning;
  }

  dispose(): void {
    this.testRunning = false;
  }
}