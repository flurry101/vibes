import { ActivityState, VibeMode } from '../types/index.js';

export class StrudelGenerator {
  // Strudel is a live coding music language
  // https://strudel.tidalcycles.org/
  
  generateStrudelCode(state: ActivityState, vibe: VibeMode): string {
    const patterns = {
      'idle': `// Idle ambient
note("c2 e2 g2").slow(4).gain(0.3).room(0.9)`,
      
      'productive': `// Productive flow
stack(
  note("<c4 e4 g4 b4>").fast(2),
  note("c2").slow(2)
).gain(0.5).lpf(2000)`,
      
      'stuck': `// Contemplative
note("<a3 c4 e4>").slow(3).delay(0.5).room(0.7).gain(0.4)`,
      
      'procrastinating': `// Anxious
note("<d4 f4 a4>").fast(3).sometimes(rev).gain(0.5)`,
      
      'testing': `// Suspenseful
note("<g3 b3 d4>").struct("x x . x").delay(0.3).gain(0.4)`,
      
      'building': `// Elevator music
note("<c3 g3>").slow(8).gain(0.2).room(0.5)`,
      
      'test_passed': `// Celebration!
stack(
  note("<c5 e5 g5 c6>").fast(4),
  note("c2 g2").fast(2)
).gain(0.7).lpf(4000)`,
      
      'test_failed': `// Disappointment
note("<e4 d4 c4 b3>").slow(2).gain(0.3).lpf(1000)`
    };

    const basePattern = patterns[state] || patterns['idle'];

    // Modify based on vibe
    if (vibe === 'roasting') {
      return basePattern + `.sometimes(x => x.fast(1.5).gain(0.6))`; // More chaotic
    } else if (vibe === 'neutral') {
      return basePattern; // Keep as is
    } else {
      return basePattern + `.room(0.5)`; // More reverb for encouraging
    }
  }
}