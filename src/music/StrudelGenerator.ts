import { ActivityState, VibeMode } from '../types';

type PatternMap = Record<ActivityState, string>;

export class StrudelGenerator {
  private currentPattern: string = '';
  private currentState: ActivityState = 'idle';
  private currentVibe: VibeMode = 'encouraging';

  constructor() {
    console.log('Strudel Generator initialized');
  }

  async initialize(): Promise<void> {
    console.log('Initializing Strudel...');
    // Initialize Strudel library here
  }

  generatePattern(state: ActivityState, vibe: VibeMode): string {
    this.currentState = state;
    this.currentVibe = vibe;

    const basePattern = this.getBasePattern(state);
    const modifiedPattern = this.applyVibe(basePattern, vibe);
    
    this.currentPattern = modifiedPattern;
    return modifiedPattern;
  }

  private getBasePattern(state: ActivityState): string {
    const patterns: PatternMap = {
      idle: 'sound("bd").slow(2)',
      productive: 'sound("bd hh sd hh").fast(1.5)',
      stuck: 'sound("bd . sd .").slow(1)',
      procrastinating: 'sound("bd . . .").slow(2)',
      testing: 'sound("bd sd").palindrome()',
      building: 'sound("bd hh sd hh").fast(2)',
      test_passed: 'sound("bd*4 sd*4").fast(2)',
      test_failed: 'sound("bd sd").rev().slow(1)'
    };
    
    return patterns[state] || patterns.idle;
  }

  private applyVibe(pattern: string, vibe: VibeMode): string {
    switch (vibe) {
      case 'encouraging':
        return `${pattern}.gain(0.8)`;
      case 'roasting':
        return `${pattern}.gain(0.6).fast(1.2)`;
      case 'neutral':
        return `${pattern}.gain(0.5)`;
      default:
        return pattern;
    }
  }

  async play(): Promise<void> {
    console.log('Playing pattern:', this.currentPattern);
    // Strudel play logic here
  }

  stop(): void {
    console.log('Stopping Strudel playback');
    // Strudel stop logic here
  }

  dispose(): void {
    this.stop();
  }

  getCurrentPattern(): string {
    return this.currentPattern;
  }
}