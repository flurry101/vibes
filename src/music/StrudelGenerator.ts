import { ActivityState, VibeMode } from '../types';

interface MusicConfig {
  tempo: number;
  notes: string[];
  duration: string;
  pattern: string;
  volume: number;
  mood: string;
}

type MusicConfigs = Record<string, MusicConfig>;

export class StrudelGenerator {
  private currentPattern: string = '';
  private currentState: ActivityState = 'idle';
  private currentVibe: VibeMode = 'encouraging';

  // Music configurations from the task
  private musicConfigs: MusicConfigs = {
    'idle-encouraging': {
      tempo: 70, notes: ['C3', 'E3', 'G3'], duration: '1n', pattern: 'chord', volume: -20, mood: 'calm ambient'
    },
    'productive-encouraging': {
      tempo: 128, notes: ['C4', 'E4', 'G4', 'B4'], duration: '4n', pattern: 'arpeggio', volume: -10, mood: 'energetic flow'
    },
    'stuck-encouraging': {
      tempo: 80, notes: ['A3', 'C4', 'E4'], duration: '2n', pattern: 'chord', volume: -15, mood: 'contemplative support'
    },
    'procrastinating-encouraging': {
      tempo: 110, notes: ['D4', 'F4', 'A4'], duration: '8n', pattern: 'ascending', volume: -12, mood: 'gentle urgency'
    },
    'testing-encouraging': {
      tempo: 100, notes: ['G3', 'B3', 'D4'], duration: '4n', pattern: 'chord', volume: -12, mood: 'hopeful suspense'
    },
    'building-encouraging': {
      tempo: 60, notes: ['C3', 'G3'], duration: '1n', pattern: 'chord', volume: -18, mood: 'patient waiting'
    },
    'test_passed-encouraging': {
      tempo: 150, notes: ['C5', 'E5', 'G5', 'C6'], duration: '16n', pattern: 'ascending', volume: -5, mood: 'joyful triumph'
    },
    'test_failed-encouraging': {
      tempo: 70, notes: ['A3', 'F3', 'C3'], duration: '4n', pattern: 'descending', volume: -15, mood: 'sympathetic comfort'
    },

    'idle-roasting': {
      tempo: 75, notes: ['C3', 'Eb3', 'Gb3'], duration: '1n', pattern: 'chord', volume: -20, mood: 'sarcastic judgment'
    },
    'productive-roasting': {
      tempo: 135, notes: ['C4', 'Eb4', 'Gb4', 'A4'], duration: '8n', pattern: 'arpeggio', volume: -12, mood: 'skeptical energy'
    },
    'stuck-roasting': {
      tempo: 85, notes: ['E4', 'Eb4', 'D4', 'C4'], duration: '4n', pattern: 'descending', volume: -15, mood: 'mocking pity'
    },
    'procrastinating-roasting': {
      tempo: 120, notes: ['Bb3', 'C4', 'Bb3'], duration: '8n', pattern: 'arpeggio', volume: -10, mood: 'annoyed impatience'
    },
    'testing-roasting': {
      tempo: 95, notes: ['G3', 'Bb3', 'Db4'], duration: '4n', pattern: 'chord', volume: -12, mood: 'doubtful anticipation'
    },
    'building-roasting': {
      tempo: 55, notes: ['C3', 'F3'], duration: '1n', pattern: 'chord', volume: -20, mood: 'bored waiting'
    },
    'test_passed-roasting': {
      tempo: 140, notes: ['C5', 'Eb5', 'G5'], duration: '16n', pattern: 'ascending', volume: -8, mood: 'surprised approval'
    },
    'test_failed-roasting': {
      tempo: 75, notes: ['E4', 'D4', 'C4', 'B3'], duration: '4n', pattern: 'descending', volume: -12, mood: 'told you so'
    },

    'idle-neutral': {
      tempo: 72, notes: ['C3', 'G3', 'C4'], duration: '1n', pattern: 'chord', volume: -18, mood: 'neutral standby'
    },
    'productive-neutral': {
      tempo: 120, notes: ['C4', 'D4', 'E4', 'G4'], duration: '4n', pattern: 'ascending', volume: -12, mood: 'systematic efficiency'
    },
    'stuck-neutral': {
      tempo: 80, notes: ['A3', 'E4', 'A4'], duration: '2n', pattern: 'chord', volume: -15, mood: 'analytical pause'
    },
    'procrastinating-neutral': {
      tempo: 105, notes: ['C4', 'E4', 'C4'], duration: '8n', pattern: 'arpeggio', volume: -13, mood: 'deviation detected'
    },
    'testing-neutral': {
      tempo: 95, notes: ['C4', 'E4', 'G4'], duration: '4n', pattern: 'chord', volume: -12, mood: 'execution in progress'
    },
    'building-neutral': {
      tempo: 60, notes: ['C3', 'E3'], duration: '1n', pattern: 'chord', volume: -20, mood: 'compilation running'
    },
    'test_passed-neutral': {
      tempo: 130, notes: ['C5', 'E5', 'G5'], duration: '8n', pattern: 'ascending', volume: -10, mood: 'success confirmed'
    },
    'test_failed-neutral': {
      tempo: 75, notes: ['C4', 'Bb3', 'Ab3'], duration: '4n', pattern: 'descending', volume: -15, mood: 'error detected'
    }
  };

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

    const configKey = `${state}-${vibe}`;
    const config = this.musicConfigs[configKey];

    if (!config) {
      console.warn(`No config found for ${configKey}, using idle-encouraging`);
      return this.generateStrudelPattern(this.musicConfigs['idle-encouraging']);
    }

    this.currentPattern = this.generateStrudelPattern(config);
    return this.currentPattern;
  }

  private generateStrudelPattern(config: MusicConfig): string {
    const noteString = config.notes.join(' ');
    let pattern = `note("${noteString}").${config.pattern}()`;

    // Apply duration
    pattern += `.${config.duration}`;

    // Apply tempo (bpm)
    pattern += `.slow(${60 / config.tempo})`; // Strudel uses relative speed

    // Apply volume
    const gain = Math.max(0, Math.min(1, (config.volume + 30) / 30)); // Convert dB to 0-1
    pattern += `.gain(${gain})`;

    return pattern;
  }

  getCurrentConfig(): MusicConfig | null {
    const configKey = `${this.currentState}-${this.currentVibe}`;
    return this.musicConfigs[configKey] || null;
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

  // Methods for real-time parameter changes
  changeBeats(beatType: string): string {
    // Update beat patterns based on type
    const beatConfigs: Record<string, { notes: string[], pattern: string, duration: string }> = {
      'kick': { notes: ['C2'], pattern: 'kick', duration: '4n' },
      'snare': { notes: ['D2'], pattern: 'snare', duration: '4n' },
      'hihat': { notes: ['F#2'], pattern: 'hihat', duration: '8n' },
      'clap': { notes: ['Bb2'], pattern: 'clap', duration: '4n' },
      'tom': { notes: ['A2', 'E2'], pattern: 'tom', duration: '4n' }
    };

    const config = beatConfigs[beatType] || beatConfigs['kick'];
    const pattern = `note("${config.notes.join(' ')}").${config.pattern}().${config.duration}`;
    this.currentPattern = pattern;
    return pattern;
  }

  changeRhythm(rhythmType: string): string {
    // Update rhythm patterns
    const rhythmConfigs: Record<string, { pattern: string, duration: string }> = {
      'straight': { pattern: 'straight', duration: '4n' },
      'swing': { pattern: 'swing', duration: '4nt' },
      'shuffle': { pattern: 'shuffle', duration: '4nt' },
      'triplet': { pattern: 'triplet', duration: '8n' },
      'polyrhythm': { pattern: 'polyrhythm', duration: '4n' }
    };

    const config = rhythmConfigs[rhythmType] || rhythmConfigs['straight'];
    // Apply rhythm transformation to current pattern
    this.currentPattern = this.currentPattern + `.${config.pattern}()`;
    return this.currentPattern;
  }

  changeSpeed(speedType: string): number {
    // Update tempo based on speed type
    const speedConfigs: Record<string, number> = {
      'slow': 80,
      'medium': 120,
      'fast': 160,
      'very-fast': 200
    };

    const newTempo = speedConfigs[speedType] || 120;
    // Update current config tempo
    if (this.currentState && this.currentVibe) {
      const configKey = `${this.currentState}-${this.currentVibe}`;
      if (this.musicConfigs[configKey]) {
        this.musicConfigs[configKey].tempo = newTempo;
      }
    }
    return newTempo;
  }
}