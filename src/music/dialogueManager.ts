// src/music/dialogueManager.ts
export type DialogueContext = 
  | 'triumph'      // Solved a problem
  | 'struggle'     // Stuck for a while
  | 'error'        // Compilation error
  | 'success'      // Tests passed
  | 'motivation';  // General encouragement

export interface DialogueQuote {
  text: string;
  audioUrl?: string;
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
      {
        text: "To infinity and beyond!",
        context: 'triumph',
        source: 'Buzz Lightyear'
      },
      {
        text: "I am Iron Man",
        context: 'triumph',
        source: 'Tony Stark'
      },
      {
        text: "Avengers... assemble!",
        context: 'triumph',
        source: 'Captain America'
      },
      {
        text: "I'm king of the world!",
        context: 'triumph',
        source: 'Titanic'
      }
    ],
    struggle: [
      {
        text: "I have a bad feeling about this",
        context: 'struggle',
        source: 'Star Wars'
      },
      {
        text: "May the force be with you",
        context: 'struggle',
        source: 'Star Wars'
      },
      {
        text: "Winter is coming",
        context: 'struggle',
        source: 'Game of Thrones'
      },
      {
        text: "Why so serious?",
        context: 'struggle',
        source: 'The Dark Knight'
      }
    ],
    error: [
      {
        text: "Houston, we have a problem",
        context: 'error',
        source: 'Apollo 13'
      },
      {
        text: "I've made a huge mistake",
        context: 'error',
        source: 'Arrested Development'
      },
      {
        text: "This is Sparta!",
        context: 'error',
        source: '300'
      }
    ],
    success: [
      {
        text: "Just keep swimming",
        context: 'success',
        source: 'Finding Nemo'
      },
      {
        text: "Bond. James Bond.",
        context: 'success',
        source: '007'
      },
      {
        text: "Here's Johnny!",
        context: 'success',
        source: 'The Shining'
      }
    ],
    motivation: [
      {
        text: "Do or do not. There is no try.",
        context: 'motivation',
        source: 'Yoda'
      },
      {
        text: "Sometimes you gotta run before you can walk",
        context: 'motivation',
        source: 'Tony Stark'
      }
    ]
  };

  constructor(enabled = false, frequency: 'off' | 'rare' | 'normal' | 'frequent' = 'rare') {
    this.enabled = enabled;
    this.frequency = frequency;
    this.updateCooldown();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setFrequency(frequency: 'off' | 'rare' | 'normal' | 'frequent') {
    this.frequency = frequency;
    this.updateCooldown();
  }

  private updateCooldown() {
    const cooldowns = {
      off: Infinity,
      rare: 60 * 60 * 1000,      // 1 hour
      normal: 30 * 60 * 1000,    // 30 minutes
      frequent: 15 * 60 * 1000   // 15 minutes
    };
    this.dialogueCooldown = cooldowns[this.frequency];
  }

  async playDialogue(context: DialogueContext, sessionDuration: number): Promise<DialogueQuote | null> {
    // Don't play if disabled
    if (!this.enabled || this.frequency === 'off') {
      return null;
    }

    // Don't play in first 15 minutes
    if (sessionDuration < 15 * 60 * 1000) {
      return null;
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastDialogue < this.dialogueCooldown) {
      return null;
    }

    // Get random quote for context
    const contextQuotes = this.quotes[context];
    if (!contextQuotes || contextQuotes.length === 0) {
      return null;
    }

    const quote = contextQuotes[Math.floor(Math.random() * contextQuotes.length)];
    this.lastDialogue = now;

    // Note: Audio playback happens in webview, not here
    console.log(`💬 ${quote.text} - ${quote.source}`);

    return quote;
  }

  // Add custom quotes
  addQuote(context: DialogueContext, quote: DialogueQuote) {
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
}