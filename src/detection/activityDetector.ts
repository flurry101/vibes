import * as vscode from 'vscode';

export type ActivityState = 'idle' | 'productive' | 'stuck' | 'testing';

export class ActivityDetector {
  private lastActivity: number = Date.now();
  private typingCount: number = 0;
  private currentState: ActivityState = 'idle';

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

    // Check for idle every 5 seconds
    setInterval(() => {
      const idleTime = Date.now() - this.lastActivity;
      if (idleTime > 30000) { // 30 seconds
        this.updateState('idle');
      }
    }, 5000);
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
    
    if (idleTime > 30000) return 'idle';
    if (this.typingCount > 10) return 'productive';
    if (idleTime > 10000 && idleTime < 30000) return 'stuck';
    
    return 'productive';
  }

  // TODO: Test runner detection
  onTestRun(passed: boolean) {
    this.updateState('testing');
  }
}