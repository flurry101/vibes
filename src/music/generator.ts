import * as Tone from 'tone';

export type MusicState = 'idle' | 'productive' | 'stuck' | 'testing' | 'celebrating';

export class MusicGenerator {
  private synth: Tone.PolySynth | null = null;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    await Tone.start();
    this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
    this.initialized = true;
  }

  async playStateMusic(state: MusicState) {
    if (!this.initialized) await this.initialize();
    
    // TODO: AI-generated music
    // For now, simple placeholder
    switch (state) {
      case 'productive':
        this.synth?.triggerAttackRelease(['C4', 'E4', 'G4'], '4n');
        break;
      case 'stuck':
        this.synth?.triggerAttackRelease(['A3', 'C4'], '2n');
        break;
      case 'celebrating':
        this.synth?.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '8n');
        break;
    }
  }

  stop() {
    Tone.Transport.stop();
  }
}