// src/music/dialogueManager.ts
export type DialogueContext = 
  | 'triumph'      // Solved a problem
  | 'struggle'     // Stuck for a while
  | 'error'        // Compilation error
  | 'success'      // Tests passed
  | 'motivation';  // General encouragement

export interface DialogueQuote {
  text: string;
  audioUrl?: string;      // URL to audio clip
  videoUrl?: string;      // URL to YouTube clip
  videoStartTime?: number; // Start time in seconds for video
  videoDuration?: number;  // Duration to play in seconds
  context: DialogueContext;
  source: string;
}

export class DialogueManager {
  private lastDialogue = 0;
  private dialogueCooldown = 60 * 60 * 1000; // 1 hour default
  private enabled = false;
  private frequency: 'off' | 'rare' | 'normal' | 'frequent' = 'rare';
  
  private quotes: Record<DialogueContext, DialogueQuote[]> = {
	triumph: [
		{ text: "To infinity and beyond!", context: 'triumph', source: 'Buzz Lightyear' },
		{ text: "I am Iron Man", context: 'triumph', source: 'Tony Stark' },
		{ text: "Avengers... assemble!", context: 'triumph', source: 'Captain America' },
		{ text: "I'm king of the world!", context: 'triumph', source: 'Titanic' },
		{ text: "Yippee-ki-yay!", context: 'triumph', source: 'Die Hard' },
		{ text: "Great Scott!", context: 'triumph', source: 'Back to the Future' },
		{ text: "I'll be back", context: 'triumph', source: 'Terminator' }
	],
	struggle: [
		{ text: "I have a bad feeling about this", context: 'struggle', source: 'Star Wars' },
		{ text: "May the force be with you", context: 'struggle', source: 'Star Wars' },
		{ text: "Winter is coming", context: 'struggle', source: 'Game of Thrones' },
		{ text: "Why so serious?", context: 'struggle', source: 'The Dark Knight' },
		{ text: "You shall not pass!", context: 'struggle', source: 'LOTR' },
		{ text: "This is where the fun begins", context: 'struggle', source: 'Star Wars' }
	],
	error: [
		{ text: "Houston, we have a problem", context: 'error', source: 'Apollo 13' },
		{ text: "I've made a huge mistake", context: 'error', source: 'Arrested Development' },
		{ text: "This is Sparta!", context: 'error', source: '300' },
		{ text: "Oh no! Anyway...", context: 'error', source: 'Top Gear' },
		{ text: "It's not a bug, it's a feature", context: 'error', source: 'Every Dev Ever' }
	],
	success: [
		{ text: "Just keep swimming", context: 'success', source: 'Finding Nemo' },
		{ text: "Bond. James Bond.", context: 'success', source: '007' },
		{ text: "Say hello to my little friend!", context: 'success', source: 'Scarface' },
		{ text: "Here's looking at you, kid", context: 'success', source: 'Casablanca' },
		{ text: "You're gonna need a bigger boat", context: 'success', source: 'Jaws' }
	],
	motivation: [
		{ text: "Do or do not. There is no try.", context: 'motivation', source: 'Yoda' },
		{ text: "Sometimes you gotta run before you can walk", context: 'motivation', source: 'Tony Stark' },
		{ text: "With great power comes great responsibility", context: 'motivation', source: 'Spider-Man' },
		{ text: "Life finds a way", context: 'motivation', source: 'Jurassic Park' },
		{ text: "Keep your friends close, but your enemies closer", context: 'motivation', source: 'The Godfather' },
		{ text: "Carpe diem. Seize the day, boys", context: 'motivation', source: 'Dead Poets Society' }
	]
};

  constructor(enabled = false, frequency: 'off' | 'rare' | 'normal' | 'frequent' = 'rare') {
    this.enabled = enabled;
    this.frequency = frequency;
    this.updateCooldown();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setFrequency(frequency: 'off' | 'rare' | 'normal' | 'frequent'): void {
    this.frequency = frequency;
    this.updateCooldown();
  }

  private updateCooldown(): void {
	const cooldowns = {
		off: Infinity,
		rare: 30 * 60 * 1000,      // 30 minutes
		normal: 10 * 60 * 1000,    // 10 minutes
		frequent: 5 * 60 * 1000    // 5 minutes
	};
	this.dialogueCooldown = cooldowns[this.frequency];
	console.log(`Dialogue cooldown set to: ${this.dialogueCooldown / 1000 / 60} minutes for frequency: ${this.frequency}`);
}

  async playDialogue(context: DialogueContext, sessionDuration: number): Promise<DialogueQuote | null> {
	console.log('Dialogue check - Enabled:', this.enabled, 'Frequency:', this.frequency, 'Context:', context);
	
	// Don't play if disabled
	if (!this.enabled || this.frequency === 'off') {
		console.log('Dialogue disabled or off');
		return null;
	}

	// Don't play in first 30 seconds of session
	if (sessionDuration < 30 * 1000) {
		console.log('Session too short:', sessionDuration);
		return null;
	}

	// Check cooldown
	const now = Date.now();
	const timeSinceLastDialogue = now - this.lastDialogue;
	console.log('Time since last dialogue:', timeSinceLastDialogue, 'Cooldown:', this.dialogueCooldown);
	
	if (this.lastDialogue > 0 && timeSinceLastDialogue < this.dialogueCooldown) {
		console.log('Still in cooldown');
		return null;
	}

	// Get random quote for context
	const contextQuotes = this.quotes[context];
	if (!contextQuotes || contextQuotes.length === 0) {
		console.log('No quotes for context:', context);
		return null;
	}

	const quote = contextQuotes[Math.floor(Math.random() * contextQuotes.length)];
	this.lastDialogue = now;

	console.log('💬 Playing dialogue:', quote.text, '-', quote.source);

	return quote;
}

  // Add custom quotes - useful for extending the dialogue system
  addQuote(context: DialogueContext, quote: DialogueQuote): void {
    if (!this.quotes[context]) {
      this.quotes[context] = [];
    }
    this.quotes[context].push(quote);
  }

  // Get random quote without playing
  getRandomQuote(context: DialogueContext): DialogueQuote | null {
    const contextQuotes = this.quotes[context];
    if (!contextQuotes || contextQuotes.length === 0) {
      return null;
    }
    return contextQuotes[Math.floor(Math.random() * contextQuotes.length)];
  }

  // Get all quotes for a context (useful for UI display)
  getAllQuotes(context: DialogueContext): DialogueQuote[] {
    return this.quotes[context] || [];
  }
}