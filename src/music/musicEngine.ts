// src/music/musicEngine.ts
import * as Tone from 'tone';

export type MusicMood = 'ambient' | 'focused' | 'energetic' | 'calm' | 'celebration';
export type ActivityLevel = 'idle' | 'low' | 'high';

export interface MusicSettings {
  maxVolume: number; // 0-1
  enableVocals: boolean;
  enableCelebrations: boolean;
  enableDialogue: boolean;
  dialogueFrequency: 'off' | 'rare' | 'normal' | 'frequent';
  quietHoursStart?: number; // hour 0-23
  quietHoursEnd?: number;
}

export class MusicEngine {
  private synth: Tone.PolySynth | null = null;
  private player: Tone.Player | null = null;
  private reverb: Tone.Reverb | null = null;
  private filter: Tone.Filter | null = null;
  private volume: Tone.Volume | null = null;
  
  private currentMood: MusicMood = 'ambient';
  private currentActivity: ActivityLevel = 'idle';
  private isPlaying = false;
  private crossfadeTimeout: NodeJS.Timeout | null = null;
  
  private settings: MusicSettings = {
    maxVolume: 0.5,
    enableVocals: false,
    enableCelebrations: true,
    enableDialogue: false,
    dialogueFrequency: 'rare'
  };

  private lastCelebration = 0;
  private celebrationCooldown = 15 * 60 * 1000; // 15 minutes

  async initialize(settings?: Partial<MusicSettings>) {
    if (settings) {
      this.settings = { ...this.settings, ...settings };
    }

    // Initialize Tone.js audio context
    await Tone.start();
    console.log('🎵 Tone.js initialized');

    // Create effects chain
    this.reverb = new Tone.Reverb({ decay: 3, wet: 0.3 });
    this.filter = new Tone.Filter({ frequency: 2000, type: 'lowpass' });
    this.volume = new Tone.Volume(-20); // Start quiet

    // Create synth
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 2,
        decay: 0.5,
        sustain: 0.8,
        release: 3
      }
    });

    // Connect effects chain
    await this.reverb.ready;
    this.synth.chain(this.filter, this.reverb, this.volume, Tone.Destination);

    console.log('🎵 Music engine ready');
  }

  // Main music control
  async playForState(mood: MusicMood, activity: ActivityLevel) {
    if (this.isInQuietHours()) {
      this.stop();
      return;
    }

    const targetVolume = this.calculateVolume(activity);
    
    if (mood !== this.currentMood) {
      await this.crossfadeMood(mood, targetVolume);
    } else {
      this.adjustVolume(targetVolume);
    }

    this.currentMood = mood;
    this.currentActivity = activity;

    if (!this.isPlaying) {
      this.startLoop();
    }
  }

  private startLoop() {
    if (!this.synth || !this.volume) {
        return;
    }
    this.isPlaying = true;
    const pattern = this.getMoodPattern(this.currentMood);
    
    // Create a looping pattern
    const loop = new Tone.Loop((time) => {
      if (!this.synth) {
        return;
      }
      pattern.notes.forEach((note, i) => {
        this.synth!.triggerAttackRelease(
          note,
          pattern.duration,
          time + i * pattern.interval
        );
      });
    }, pattern.loopLength);

    loop.start(0);
    Tone.Transport.start();
  }

  private getMoodPattern(mood: MusicMood) {
    const patterns = {
      ambient: {
        notes: ['C3', 'E3', 'G3', 'B3'],
        duration: '2n',
        interval: 2,
        loopLength: '8n'
      },
      focused: {
        notes: ['D3', 'F3', 'A3'],
        duration: '4n',
        interval: 1.5,
        loopLength: '4n'
      },
      energetic: {
        notes: ['E3', 'G3', 'B3', 'D4'],
        duration: '8n',
        interval: 0.5,
        loopLength: '2n'
      },
      calm: {
        notes: ['A2', 'C3', 'E3'],
        duration: '1n',
        interval: 3,
        loopLength: '1m'
      },
      celebration: {
        notes: ['C4', 'E4', 'G4', 'C5'],
        duration: '16n',
        interval: 0.25,
        loopLength: '4n'
      }
    };

    return patterns[mood] || patterns.ambient;
  }

  private calculateVolume(activity: ActivityLevel): number {
    const base = {
      idle: 0.15,
      low: 0.30,
      high: 0.70
    };

    return Math.min(base[activity], this.settings.maxVolume);
  }

  private async crossfadeMood(newMood: MusicMood, targetVolume: number) {
    if (!this.volume){
        return;
    }

    if(this.crossfadeTimeout){
        clearTimeout(this.crossfadeTimeout);
        this.crossfadeTimeout =null;
        Tone.Transport.stop();
    }
    // Fade out current
    this.volume.volume.rampTo(-60, 10);

    // Wait for fade
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Switch mood and fade in
    this.currentMood = newMood;
    const dbVolume = this.linearToDb(targetVolume);
    this.volume.volume.rampTo(dbVolume, 10);
  }

  private adjustVolume(targetVolume: number) {
    if (!this.volume) {
        return;
    }
    const dbVolume = this.linearToDb(targetVolume);
    this.volume.volume.rampTo(dbVolume, 2); // Smooth 2s transition
  }

  private linearToDb(linear: number): number {
    if (linear === 0) {
        return -60;
    }
    return 20 * Math.log10(linear);
  }

  // Celebration sounds
  async playCelebration(type: 'small' | 'medium' | 'large' = 'medium') {
    if (!this.settings.enableCelebrations) {
        return;
    }
    const now = Date.now();
    if (now - this.lastCelebration < this.celebrationCooldown) {
      console.log('🎵 Celebration on cooldown');
      return;
    }

    this.lastCelebration = now;

    const celebrations = {
      small: this.playSmallWin.bind(this),
      medium: this.playMediumWin.bind(this),
      large: this.playLargeWin.bind(this)
    };

    await celebrations[type]();
  }

  private async playSmallWin() {
    const synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.3 }
    }).toDestination();

    const now = Tone.now();
    synth.triggerAttackRelease('C5', '8n', now);
    synth.triggerAttackRelease('E5', '8n', now + 0.1);
    synth.triggerAttackRelease('G5', '8n', now + 0.2);

    setTimeout(() => synth.dispose(), 1000);
  }

  private async playMediumWin() {
    const synth = new Tone.PolySynth().toDestination();

    const sequence = [
      ['C5', 'E5'],
      ['E5', 'G5'],
      ['G5', 'C6']
    ];

    const now = Tone.now();
    sequence.forEach((chord, i) => {
      synth.triggerAttackRelease(chord, '8n', now + i * 0.15);
    });

    setTimeout(() => synth.dispose(), 1500);
  }

  private async playLargeWin() {
    const synth = new Tone.PolySynth().toDestination();

    const arpeggio = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
    
    const now = Tone.now();
    arpeggio.forEach((note, i) => {
      synth.triggerAttackRelease(note, '16n', now + i * 0.1);
    });

    // Final chord
    synth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '2n', now + 0.8);

    setTimeout(() => synth.dispose(), 3000);
  }

  // Utility methods
  stop() {
    this.isPlaying = false;
    Tone.Transport.stop();
    if (this.volume) {
      this.volume.volume.rampTo(-60, 2);
    }
  }

  pause() {
    Tone.Transport.pause();
  }

  resume() {
    if (this.isPlaying) {
      Tone.Transport.start();
    }
  }

  updateSettings(newSettings: Partial<MusicSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    
    // Adjust current volume if needed
    if (this.isPlaying) {
      this.adjustVolume(this.calculateVolume(this.currentActivity));
    }
  }

  private isInQuietHours(): boolean {
    const { quietHoursStart, quietHoursEnd } = this.settings;
    if (quietHoursStart === undefined || quietHoursEnd === undefined) {
      return false;
    }

    const hour = new Date().getHours();
    if (quietHoursStart < quietHoursEnd) {
      return hour >= quietHoursStart && hour < quietHoursEnd;
    } else {
      return hour >= quietHoursStart || hour < quietHoursEnd;
    }
  }

  dispose() {
    this.stop();
    this.synth?.dispose();
    this.player?.dispose();
    this.reverb?.dispose();
    this.filter?.dispose();
    this.volume?.dispose();
  }
}