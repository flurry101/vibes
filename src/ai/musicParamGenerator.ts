// src/music/generator.ts
// NOTE: This file is meant to be used in the WEBVIEW (browser context), not in the extension backend

import { MusicParameters, ActivityState, VibeMode, MusicParamGenerator } from '../ai/musicParamGenerator';

// Tone.js will be loaded via CDN in the webview HTML

export class MusicGenerator {
  private synth: any | null = null;
  private loop: any | null = null;
  private initialized = false;
  private aiGenerator: MusicParamGenerator;
  private currentParams: MusicParameters | null = null;
  private Tone: any; // Reference to global Tone object from CDN

  constructor(apiKey: string, ToneRef: any) {
    this.aiGenerator = new MusicParamGenerator(apiKey);
    this.Tone = ToneRef;
  }

  /**
   * Initialize Tone.js
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await this.Tone.start();
    
    // Create polyphonic synthesizer with reverb
    this.synth = new this.Tone.PolySynth(this.Tone.Synth, {
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.05,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8
      }
    }).toDestination();

    // Add reverb for atmosphere
    const reverb = new this.Tone.Reverb({
      decay: 2,
      wet: 0.3
    }).toDestination();

    this.synth.connect(reverb);
    
    this.initialized = true;
    console.log('✅ Music generator initialized');
  }

  /**
   * Play music based on AI-generated parameters
   */
  async playForState(state: ActivityState, vibe: VibeMode) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Stop current music
    this.stop();

    try {
      // Generate parameters via AI
      console.log(`🎵 Generating music for ${state} + ${vibe}...`);
      this.currentParams = await this.aiGenerator.generateMusicParams(state, vibe);
      
      console.log('🎶 Music params:', this.currentParams);

      // Play the music
      this.playFromParams(this.currentParams);
    } catch (error) {
      console.error('Failed to generate/play music:', error);
    }
  }

  /**
   * Play music from parameters
   */
  private playFromParams(params: MusicParameters) {
    if (!this.synth) {
      return;
    }

    // Set volume
    this.synth.volume.value = params.volume;

    // Create playback pattern
    const { notes, duration, pattern, tempo } = params;
    
    // Set BPM
    this.Tone.Transport.bpm.value = tempo;

    // Determine how to play based on pattern
    switch (pattern) {
      case 'chord':
        this.playChord(notes, duration);
        break;
      case 'ascending':
      case 'descending':
        this.playSequence(notes, duration, pattern === 'descending');
        break;
      case 'arpeggio':
        this.playArpeggio(notes, duration);
        break;
    }

    // Start transport
    this.Tone.Transport.start();
  }

  /**
   * Play chord (all notes together)
   */
  private playChord(notes: string[], duration: string) {
    this.loop = new this.Tone.Loop((time: number) => {
      this.synth?.triggerAttackRelease(notes, duration, time);
    }, duration === '8n' ? '2n' : '1n'); // Repeat interval
    
    this.loop.start(0);
  }

  /**
   * Play sequence (one note at a time)
   */
  private playSequence(notes: string[], duration: string, reverse: boolean) {
    const sequence = reverse ? [...notes].reverse() : notes;
    
    const seq = new this.Tone.Sequence((time: number, note: string) => {
      this.synth?.triggerAttackRelease(note, duration, time);
    }, sequence, duration);
    
    seq.start(0);
  }

  /**
   * Play arpeggio (broken chord pattern)
   */
  private playArpeggio(notes: string[], duration: string) {
    // Create up-down arpeggio pattern
    const pattern = [...notes, ...notes.slice().reverse().slice(1, -1)];
    
    const seq = new this.Tone.Sequence((time: number, note: string) => {
      this.synth?.triggerAttackRelease(note, duration, time);
    }, pattern, duration);
    
    seq.start(0);
  }

  /**
   * Play celebration sound (for test pass)
   */
  async playCelebration() {
    if (!this.initialized) {
      await this.initialize();
    }

    const celebration: MusicParameters = {
      tempo: 160,
      notes: ['C5', 'E5', 'G5', 'C6', 'E6'],
      duration: '16n',
      pattern: 'ascending',
      volume: -5,
      mood: 'triumphant'
    };

    this.stop();
    this.playFromParams(celebration);

    // Auto-stop after 2 seconds
    setTimeout(() => this.stop(), 2000);
  }

  /**
   * Play failure sound (for test fail)
   */
  async playFailure() {
    if (!this.initialized) {
      await this.initialize();
    }

    // Sad trombone effect
    const failure: MusicParameters = {
      tempo: 60,
      notes: ['E4', 'D4', 'C4', 'B3'],
      duration: '4n',
      pattern: 'descending',
      volume: -15,
      mood: 'disappointed'
    };

    this.stop();
    this.playFromParams(failure);

    // Auto-stop after 1.5 seconds
    setTimeout(() => this.stop(), 1500);
  }

  /**
   * Stop all music
   */
  stop() {
    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }
    
    this.Tone.Transport.stop();
    this.Tone.Transport.cancel(0);
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stop();
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    this.initialized = false;
  }
}