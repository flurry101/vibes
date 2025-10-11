import * as vscode from 'vscode';
import { ActivityState, ActivityMetrics } from '../types';

export class ActivityDetector {
  private lastActivity: number = Date.now();
  private lastFile: string = '';
  private typingCount: number = 0;
  private tabSwitchCount: number = 0;
  private fileChangeCount: number = 0;
  private timeInCurrentFile: number = Date.now();
  private currentState: ActivityState = 'idle';
  private typingTimer: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private resetInterval: NodeJS.Timeout | null = null;

  constructor(
    private onStateChange: (state: ActivityState, metrics: ActivityMetrics) => void
  ) {
    this.setupListeners();
    this.startMonitoring();
  }

  private setupListeners() {
    // Track typing
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.contentChanges.length > 0) {
        this.lastActivity = Date.now();
        this.typingCount += e.contentChanges[0].text.length;
        
        if (this.typingTimer) {
          clearTimeout(this.typingTimer);
        }
        this.typingTimer = setTimeout(() => {
          this.typingCount = 0;
        }, 1000);
      }
    });

    // Track file/tab switching
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        const currentFile = editor.document.fileName;
        
        if (this.lastFile && this.lastFile !== currentFile) {
          this.tabSwitchCount++;
          this.fileChangeCount++;
          this.timeInCurrentFile = Date.now();
        }
        
        this.lastFile = currentFile;
        this.lastActivity = Date.now();
      }
    });

    // Track window focus
    vscode.window.onDidChangeWindowState(state => {
      if (!state.focused) {
        this.lastActivity = Date.now();
      }
    });
  }

  private startMonitoring() {
    // Check state every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.updateState();
    }, 5000);

    // Reset counters every minute
    this.resetInterval = setInterval(() => {
      this.tabSwitchCount = 0;
      this.fileChangeCount = 0;
    }, 60000);
  }

  private getMetrics(): ActivityMetrics {
    const now = Date.now();
    return {
      typingSpeed: this.typingCount * 60,
      idleTime: now - this.lastActivity,
      tabSwitches: this.tabSwitchCount,
      fileChanges: this.fileChangeCount,
      timeInFile: now - this.timeInCurrentFile
    };
  }

  private detectState(metrics: ActivityMetrics): ActivityState {
    const { typingSpeed, idleTime, tabSwitches, timeInFile } = metrics;

    // Procrastinating: lots of tab switches, not much typing
    if (tabSwitches > 10 && typingSpeed < 100) {
      return 'procrastinating';
    }

    // Productive: actively typing
    if (typingSpeed > 200 && idleTime < 10000) {
      return 'productive';
    }

    // Stuck: been in same file for a while, not typing
    if (timeInFile > 120000 && idleTime > 30000 && idleTime < 180000) {
      return 'stuck';
    }

    // Idle: no activity for 3+ minutes
    if (idleTime > 180000) {
      return 'idle';
    }

    return typingSpeed > 50 ? 'productive' : 'stuck';
  }

  private updateState() {
    const metrics = this.getMetrics();
    const newState = this.detectState(metrics);

    if (newState !== this.currentState) {
      this.currentState = newState;
      console.log(`📊 State changed: ${newState}`, metrics);
      this.onStateChange(newState, metrics);
    }
  }

  public manualStateChange(state: ActivityState) {
    this.currentState = state;
    this.onStateChange(state, this.getMetrics());
  }

  public getCurrentState(): ActivityState {
    return this.currentState;
  }

  public getMetricsSnapshot(): ActivityMetrics {
    return this.getMetrics();
  }

  public dispose() {
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.resetInterval) {
      clearInterval(this.resetInterval);
    }
  }
}