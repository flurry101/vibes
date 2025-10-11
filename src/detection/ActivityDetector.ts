import * as vscode from 'vscode';
import { ActivityState, ActivityMetrics } from '../types';

export class ActivityDetector {
  private lastActivity: number = Date.now();
  private typingCount: number = 0;
  private currentState: ActivityState = 'idle';
  private idleTimeout: NodeJS.Timeout | null = null;
  private keystrokeTimes: number[] = [];
  private buildingDetected: boolean = false;

  constructor(private onStateChange: (state: ActivityState) => void) {
    this.startDetection();
  }

  private startDetection() {
    // Detect typing with speed tracking
    vscode.workspace.onDidChangeTextDocument(e => {
      const now = Date.now();
      this.lastActivity = now;
      this.typingCount++;
      this.keystrokeTimes.push(now);

      // Keep only last 10 keystrokes for speed calculation
      if (this.keystrokeTimes.length > 10) {
        this.keystrokeTimes.shift();
      }

      this.updateState();
    });

    // Detect building from task execution
    vscode.tasks.onDidStartTask(e => {
      const taskName = e.execution.task.name.toLowerCase();
      if (taskName.includes('build') || taskName.includes('compile')) {
        this.buildingDetected = true;
        this.updateState('building');
      }
    });

    vscode.tasks.onDidEndTask(e => {
      const taskName = e.execution.task.name.toLowerCase();
      if (taskName.includes('build') || taskName.includes('compile')) {
        this.buildingDetected = false;
        this.updateState();
      }
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
    const typingSpeed = this.calculateTypingSpeed();

    if (this.buildingDetected) {
      return 'building';
    }

    if (idleTime > 60000) {
      return 'idle';
    } // More than 60 seconds of inactivity

    if (idleTime > 30000) {
      return 'procrastinating'; // Idle but not completely inactive
    }

    if (this.typingCount > 20 && typingSpeed > 100) { // Fast typing
      return 'productive';
    }

    if (idleTime > 10000 && idleTime < 30000) {
      return 'stuck';
    }

    if (typingSpeed < 50 && this.typingCount > 5) { // Slow typing
      return 'procrastinating';
    }

    return 'productive';
  }

  private calculateTypingSpeed(): number {
    if (this.keystrokeTimes.length < 2) {return 0;};

    const recentTimes = this.keystrokeTimes.slice(-10);
    const intervals = [];
    for (let i = 1; i < recentTimes.length; i++) {
      intervals.push(recentTimes[i] - recentTimes[i-1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return 60000 / avgInterval; // keystrokes per minute
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