import { MusicData, ActivityState, VibeMode } from '../types.js';

export class MusicEngine {
  private callback: (data: MusicData) => void;
  private currentVibe: VibeMode = 'encouraging';
  private isInitialized: boolean = false;
  
  constructor(callback: (data: MusicData) => void) {
    this.callback = callback;
    console.log('Music Engine initialized');
    this.initialize();
  }

  async initialize(): Promise<void> {
    console.log('Music Engine initializing...');
    this.isInitialized = true;
    // Initialize any music libraries (Tone.js, Strudel, etc.)
  }

  async playStateMusic(state: ActivityState): Promise<void> {
    console.log('Playing music for state:', state);
    
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Send message to webview to actually play music
    this.callback({
      command: 'playMusic',
      state: state,
      vibe: this.currentVibe
    });
  }

  setVibe(vibe: VibeMode): void {
    console.log('Setting vibe:', vibe);
    this.currentVibe = vibe;
    
    this.callback({
      command: 'vibeChanged',
      vibe: vibe
    });
  }

  stop(): void {
    console.log('Stopping music');
    this.callback({
      command: 'stopMusic'
    });
  }

  dispose(): void {
    console.log('Disposing music engine');
    this.stop();
    this.isInitialized = false;
  }
}