import * as vscode from 'vscode';
import { ActivityState, ActivityMetrics } from '../types.js';

export class ActivityDetector {
  private lastActivity: number = Date.now();
  private typingCount: number = 0;
  private currentState: ActivityState = 'idle';
  private idleTimeout: NodeJS.Timeout | null = null;

  constructor(private onStateChange: (state: ActivityState) => void) {
    this.startDetection();
  }

  private startDetection() {
    // Detect typing
    vscode.workspace.onDidChangeTextDocument(e => {
      this.lastActivity = Date.now();
      this.typingCount++;
      this.updateState();
    });

    // Reset typing count after 10 seconds of inactivity
    this.startIdleTimer();

    // Check for idle every 5 seconds
    setInterval(() => {
      this.checkIdleState();
    }, 5000);
  }

  private startIdleTimer() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }

    this.idleTimeout = setTimeout(() => {
      // Reset typing count after inactivity
      this.typingCount = 0;
      this.updateState();
    }, 10000); // Reset after 10 seconds of inactivity
  }

  private checkIdleState() {
    const idleTime = Date.now() - this.lastActivity;
    
    if (idleTime > 30000) {
      this.updateState('idle');
    }
  }

  private updateState(forcedState?: ActivityState) {
    const newState = forcedState || this.detectState();
    
    if (newState !== this.currentState) {
      this.currentState = newState;
      this.onStateChange(newState);
    }
  }

  private detectState(): ActivityState {
    const idleTime = Date.now() - this.lastActivity;
    
    if (idleTime > 30000) return 'idle';  // More than 30 seconds of inactivity
    if (this.typingCount > 10) return 'productive'; // Typing count over 10 changes to productive
    if (idleTime > 10000 && idleTime < 30000) return 'stuck';  // More than 10 seconds idle but less than 30
    
    return 'productive';
  }

  public getMetrics(): ActivityMetrics {
    return {
      typingCount: this.typingCount,
      idleTime: Date.now() - this.lastActivity,
      lastActivity: this.lastActivity
    };
  }

  // Test runner detection - need to watch for test events in the terminal/output
  onTestRun(passed: boolean) {
    this.updateState(passed ? 'test_passed' : 'test_failed');
  }

  public dispose() {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
  }
}