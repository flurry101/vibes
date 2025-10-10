// src/music/generator.ts
import { MusicData } from '../types';

export type MusicState = 'idle' | 'productive' | 'stuck' | 'testing' | 'celebrating';

export class MusicGenerator {
  // This is just a placeholder
  // Real music generation happens in webview
  private callback: (data: MusicData) => void;
  constructor(callback: (data: MusicData) => void) {
    this.callback = callback;
    console.log('Music generator initialized');
  }

  async initialize() {
    console.log('Music generator initialized');
  }

  async playStateMusic(state: MusicState) {
    console.log('Playing music for state:', state);
    // Will send message to webview to actually play music
  }

  setVibe(vibe: string) {
    console.log('Setting vibe:', vibe);
    // Logic to adjust music based on the vibe, e.g., update the webview music player or settings
    // You'll implement the music-vibe mapping here
  }


  stop() {
    console.log('Stopping music');
  }
}