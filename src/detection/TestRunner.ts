import * as vscode from 'vscode';
import { ActivityDetector } from './activityDetector';

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

    // Watch for active terminal changes
    vscode.window.onDidChangeActiveTerminal(terminal => {
      if (terminal) {
        console.log('Active terminal changed:', terminal.name);
      }
    });

    // Note: onDidWriteTerminalData is not available in older VS Code versions
    // Alternative: Watch for task execution
    vscode.tasks.onDidEndTask(e => {
      const taskName = e.execution.task.name.toLowerCase();
      
      if (taskName.includes('test')) {
        // Check task result (this is a simplified approach)
        console.log('Task ended:', taskName);
        // You would need to parse output or check exit codes
      }
    });

    vscode.tasks.onDidStartTask(e => {
      const taskName = e.execution.task.name.toLowerCase();
      
      if (taskName.includes('test')) {
        this.onTestStart();
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