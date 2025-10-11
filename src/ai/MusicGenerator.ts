import { MusicParams, ActivityState, VibeMode } from '../types';

export class AIMusic Generator {
  private cache: Map<string, MusicParams> = new Map();

  constructor(private apiKey: string) {}

  async generateMusicParams(state: ActivityState, vibe: VibeMode): Promise<MusicParams> {
    const cacheKey = `${state}-${vibe}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('🎵 Using cached music params');
      return this.cache.get(cacheKey)!;
    }

    // If no API key, use fallback
    if (!this.apiKey || this.apiKey === '') {
      console.log('⚠️ No API key, using fallback');
      return this.getFallbackParams(state, vibe);
    }

    try {
      const params = await this.callAI(state, vibe);
      this.cache.set(cacheKey, params);
      return params;
    } catch (error) {
      console.error('AI music generation failed:', error);
      return this.getFallbackParams(state, vibe);
    }
  }

  private async callAI(state: ActivityState, vibe: VibeMode): Promise<MusicParams> {
    const prompt = `You are a music composer AI for a coding companion app.

Current coding state: ${state}
Companion vibe: ${vibe}

Generate music parameters that match the mood. Rules:
- For "productive": upbeat, energetic (120-140 BPM)
- For "stuck": calm, contemplative (70-90 BPM)
- For "idle": ambient, minimal (60-80 BPM)
- For "procrastinating": increasingly anxious (100-130 BPM)
- For "testing": suspenseful (90-110 BPM)
- For "building": very slow, elevator music (50-70 BPM)
- For "test_passed": triumphant, celebratory (140-160 BPM)
- For "test_failed": sad, disappointed (60-80 BPM)

Vibe adjustments:
- "encouraging": warm, supportive tones (major keys)
- "roasting": quirky, sarcastic tones (minor/diminished)
- "neutral": clean, simple tones (pure intervals)

Return ONLY a JSON object:
{
  "tempo": <BPM number>,
  "notes": ["C4", "E4", "G4"],
  "duration": "4n",
  "pattern": "chord",
  "volume": -10,
  "mood": "descriptive text"
}

Pattern options: chord, ascending, descending, arpeggio
Duration options: 8n (fast), 4n (medium), 2n (slow), 1n (very slow)
Volume: -20 (quiet) to -5 (loud)

DO NOT include any explanation, ONLY the JSON.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private getFallbackParams(state: ActivityState, vibe: VibeMode): MusicParams {
    const presets: Record<string, MusicParams> = {
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

    const key = `${state}-${vibe}`;
    return presets[key] || presets['idle-neutral'];
  }

  public clearCache() {
    this.cache.clear();
  }
}