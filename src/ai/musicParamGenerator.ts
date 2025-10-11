// src/ai/musicParamGenerator.ts

export interface MusicParameters {
  tempo: number;
  notes: string[];
  duration: string;
  pattern: 'ascending' | 'descending' | 'chord' | 'arpeggio';
  volume: number;
  mood: string;
}

export type ActivityState = 'idle' | 'productive' | 'stuck' | 'testing' | 'test_passed' | 'test_failed';
export type VibeMode = 'encouraging' | 'roasting' | 'neutral';

export class MusicParamGenerator {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate music parameters using AI based on user state and vibe
   */
  async generateMusicParams(
    state: ActivityState,
    vibe: VibeMode
  ): Promise<MusicParameters> {
    const prompt = this.buildPrompt(state, vibe);
    
    try {
      // Call Claude API (or any LLM)
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

      const data = await response.json();
      const params = this.parseAIResponse(data.content[0].text);
      
      return params;
    } catch (error) {
      console.error('AI music generation failed:', error);
      // Fallback to preset
      return this.getFallbackParams(state, vibe);
    }
  }

  /**
   * Build the AI prompt
   */
  private buildPrompt(state: ActivityState, vibe: VibeMode): string {
    return `You are a music composer AI. Generate musical parameters for a coding companion based on:

State: ${state}
Vibe: ${vibe}

State meanings:
- idle: User is not coding
- productive: User is actively coding and making progress
- stuck: User hasn't typed in a while, might be thinking
- testing: Running tests
- test_passed: Tests just passed
- test_failed: Tests just failed

Vibe meanings:
- encouraging: Uplifting, supportive music
- roasting: Playful, slightly sarcastic energy
- neutral: Calm, focused, minimal

Return ONLY a JSON object with these fields:
{
  "tempo": <60-180, integer>,
  "notes": ["<note>", "<note>", ...],
  "duration": "<8n|4n|2n|1n>",
  "pattern": "<ascending|descending|chord|arpeggio>",
  "volume": <-20 to 0, integer>,
  "mood": "<brief description>"
}

Notes format: Use standard notation like "C4", "E4", "G4", "A3", etc.
Duration: 8n=eighth note, 4n=quarter note, 2n=half note, 1n=whole note

Examples:
- Productive + Encouraging: Upbeat major chords, 120 tempo
- Stuck + Roasting: Quirky, slightly dissonant, 80 tempo
- Test Passed + Encouraging: Triumphant fanfare, 140 tempo

Generate appropriate music for: ${state} + ${vibe}`;
  }

  /**
   * Parse AI response into structured parameters
   */
  private parseAIResponse(text: string): MusicParameters {
    try {
      // Extract JSON from response (AI might wrap it in markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const params = JSON.parse(jsonMatch[0]);
      
      // Validate
      if (!params.tempo || !params.notes || !params.duration) {
        throw new Error('Invalid parameters');
      }
      
      return params as MusicParameters;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  /**
   * Fallback presets if AI fails
   */
  private getFallbackParams(state: ActivityState, vibe: VibeMode): MusicParameters {
    const presets: Record<string, MusicParameters> = {
      'productive-encouraging': {
        tempo: 120,
        notes: ['C4', 'E4', 'G4', 'C5'],
        duration: '4n',
        pattern: 'ascending',
        volume: -10,
        mood: 'upbeat'
      },
      'stuck-encouraging': {
        tempo: 80,
        notes: ['A3', 'C4', 'E4'],
        duration: '2n',
        pattern: 'chord',
        volume: -15,
        mood: 'contemplative'
      },
      'test_passed-encouraging': {
        tempo: 140,
        notes: ['C5', 'E5', 'G5', 'C6'],
        duration: '8n',
        pattern: 'ascending',
        volume: -5,
        mood: 'triumphant'
      },
      'test_failed-encouraging': {
        tempo: 90,
        notes: ['E4', 'D4', 'C4'],
        duration: '4n',
        pattern: 'descending',
        volume: -18,
        mood: 'supportive'
      },
      'productive-roasting': {
        tempo: 130,
        notes: ['C4', 'Eb4', 'Gb4'],
        duration: '8n',
        pattern: 'arpeggio',
        volume: -12,
        mood: 'playful'
      },
      'idle-neutral': {
        tempo: 70,
        notes: ['C3', 'G3'],
        duration: '1n',
        pattern: 'chord',
        volume: -20,
        mood: 'ambient'
      }
    };

    const key = `${state}-${vibe}`;
    return presets[key] || presets['idle-neutral'];
  }
}