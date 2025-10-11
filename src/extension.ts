// src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/activityDetector.js';
import { MusicGenerator } from './music/generator.js';

let activityDetector: ActivityDetector | undefined;
let musicGenerator: MusicGenerator | undefined;
let currentPanel: vscode.WebviewPanel | undefined;
let diagnosticWatcher: vscode.Disposable | undefined;
let errorCount = 0;
let stuckTimer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('🎵 Vibe-Driven Development extension activated!');

	let showCompanion = vscode.commands.registerCommand('vibe-driven-development.showCompanion', () => {
		if (currentPanel) {
			currentPanel.reveal(vscode.ViewColumn.Two);
			return;
		}

		currentPanel = vscode.window.createWebviewPanel(
			'vibeCompanion',
			'🎵 Vibe Companion',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.file(path.join(context.extensionPath, 'dist'))
				]
			}
		);

		currentPanel.webview.html = getWebviewContent();

		// Initialize Music Generator
		musicGenerator = new MusicGenerator((data) => {
			currentPanel?.webview.postMessage(data);
		});

		// Initialize music on webview load
		setTimeout(() => {
			musicGenerator?.initialize();
		}, 1000);

		// Initialize Activity Detector
		activityDetector = new ActivityDetector((newState) => {
			console.log('📡 Activity state changed:', newState);

			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: newState
			});

			musicGenerator?.playStateMusic(newState);

			// Handle stuck state
			if (newState === 'stuck') {
				if (stuckTimer) clearTimeout(stuckTimer);
				stuckTimer = setTimeout(() => {
					musicGenerator?.onStuckTooLong();
				}, 30000); // 30 seconds stuck
			} else {
				if (stuckTimer) clearTimeout(stuckTimer);
			}
		});

		// Watch for diagnostic changes (errors)
		setupDiagnosticWatcher();

		// Handle messages from Webview
		currentPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'vibeChanged':
						console.log('🎵 Vibe changed to:', message.vibe);
						musicGenerator?.setVibe(message.vibe);
						break;
					case 'requestHint':
						// TODO: AI hint generation
						currentPanel?.webview.postMessage({
							command: 'hint',
							text: 'Try breaking this into smaller functions!'
						});
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
			if (diagnosticWatcher) {
				diagnosticWatcher.dispose();
			}
			if (stuckTimer) {
				clearTimeout(stuckTimer);
			}
		});
	});

	context.subscriptions.push(showCompanion);

	// Auto-show on startup
	vscode.commands.executeCommand('vibe-driven-development.showCompanion');
}

function setupDiagnosticWatcher() {
	diagnosticWatcher = vscode.languages.onDidChangeDiagnostics((e) => {
		let totalErrors = 0;

		e.uris.forEach(uri => {
			const diagnostics = vscode.languages.getDiagnostics(uri);
			const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
			totalErrors += errors.length;
		});

		// Check if errors were solved
		if (totalErrors === 0 && errorCount > 0) {
			console.log('✅ All errors solved!');
			musicGenerator?.onErrorsSolved(0);
		}

		errorCount = totalErrors;
	});
}

function getWebviewContent(): string {
	// Return the complete HTML from the artifact above
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
	<title>VibeCode</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background: var(--vscode-editor-background);
			padding: 20px;
		}
		.container { max-width: 450px; margin: 0 auto; }
		
		h1 { 
			margin-bottom: 20px; 
			font-size: 24px;
			text-align: center;
		}
		
		.vibe-selector {
			display: flex;
			gap: 10px;
			margin: 20px 0;
			justify-content: center;
		}
		
		.vibe-btn {
			padding: 12px 20px;
			border: 2px solid var(--vscode-button-border);
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			cursor: pointer;
			border-radius: 6px;
			font-size: 14px;
			transition: all 0.2s;
		}
		
		.vibe-btn:hover {
			background: var(--vscode-button-hoverBackground);
		}
		
		.vibe-btn.active {
			background: var(--vscode-button-secondaryBackground);
			border-color: var(--vscode-focusBorder);
		}
		
		.companion {
			font-size: 80px;
			margin: 30px 0;
			text-align: center;
			animation: float 3s ease-in-out infinite;
		}
		
		@keyframes float {
			0%, 100% { transform: translateY(0px); }
			50% { transform: translateY(-10px); }
		}
		
		.message {
			font-size: 16px;
			margin: 20px 0;
			padding: 15px;
			background: var(--vscode-editor-inactiveSelectionBackground);
			border-radius: 8px;
			min-height: 60px;
			display: flex;
			align-items: center;
			justify-content: center;
			text-align: center;
		}
		
		.state {
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
			margin-top: 10px;
			text-align: center;
		}
		
		.music-status {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 10px;
			margin: 15px 0;
			font-size: 12px;
			color: var(--vscode-descriptionForeground);
		}
		
		.music-indicator {
			animation: pulse 2s ease-in-out infinite;
		}
		
		@keyframes pulse {
			0%, 100% { opacity: 0.5; }
			50% { opacity: 1; }
		}
		
		.settings {
			margin-top: 30px;
			padding: 15px;
			background: var(--vscode-editor-inactiveSelectionBackground);
			border-radius: 8px;
		}
		
		.settings h3 {
			font-size: 14px;
			margin-bottom: 10px;
		}
		
		.setting-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin: 10px 0;
			font-size: 12px;
		}
		
		.setting-item input[type="range"] {
			width: 150px;
		}
		
		.setting-item input[type="checkbox"] {
			cursor: pointer;
		}
		
		.setting-item select {
			background: var(--vscode-dropdown-background);
			color: var(--vscode-dropdown-foreground);
			border: 1px solid var(--vscode-dropdown-border);
			padding: 3px 6px;
			cursor: pointer;
		}
		
		.celebration-flash {
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(255, 215, 0, 0.3);
			pointer-events: none;
			opacity: 0;
			transition: opacity 0.3s;
		}
		
		.celebration-flash.active {
			opacity: 1;
		}
	</style>
</head>
<body>
	<div class="celebration-flash" id="celebrationFlash"></div>
	
	<div class="container">
		<h1>🎵 Vibe Companion</h1>
		
		<div class="vibe-selector">
			<button class="vibe-btn active" data-vibe="encouraging">😊 Encouraging</button>
			<button class="vibe-btn" data-vibe="roasting">😏 Roasting</button>
			<button class="vibe-btn" data-vibe="neutral">🤖 Neutral</button>
		</div>

		<div class="companion" id="companion">😊</div>
		
		<div class="message" id="message">
			Ready to vibe! Start coding...
		</div>

		<div class="music-status">
			<span class="music-indicator" id="musicIndicator">🎵</span>
			<span id="musicMood">Ambient</span>
		</div>

		<div class="state" id="state">
			State: idle • Volume: 15%
		</div>

		<div class="settings">
			<h3>⚙️ Music Settings</h3>
			
			<div class="setting-item">
				<label for="maxVolume">Max Volume:</label>
				<input type="range" id="maxVolume" min="0" max="100" value="50">
				<span id="volumeValue">50%</span>
			</div>
			
			<div class="setting-item">
				<label for="enableCelebrations">Celebrations:</label>
				<input type="checkbox" id="enableCelebrations" checked>
			</div>
			
			<div class="setting-item">
				<label for="enableDialogue">Movie Quotes:</label>
				<input type="checkbox" id="enableDialogue">
			</div>
			
			<div class="setting-item">
				<label for="dialogueFrequency">Quote Frequency:</label>
				<select id="dialogueFrequency">
					<option value="off">Off</option>
					<option value="rare" selected>Rare</option>
					<option value="normal">Normal</option>
					<option value="frequent">Frequent</option>
				</select>
			</div>
		</div>
	</div>

	<script>
		// Full webview script from the HTML artifact above
		${getWebviewScript()}
	</script>
</body>
</html>`;
}

function getWebviewScript(): string {
	return `
		const vscode = acquireVsCodeApi();
		
		let currentVibe = 'encouraging';
		let currentState = 'idle';
		let currentVolume = 0.15;
		let musicEngine = null;
		let dialogueManager = null;

		const vibeEmojis = {
			encouraging: '😊',
			roasting: '😏',
			neutral: '🤖'
		};

		const messages = {
			encouraging: {
				idle: "Ready when you are! 💪",
				productive: "You're crushing it! 🔥",
				stuck: "Take a breath, you got this! 🌟",
				testing: "Fingers crossed! 🤞"
			},
			roasting: {
				idle: "gonna code or just stare? 👀",
				productive: "wow actually working for once",
				stuck: "stackoverflow isn't gonna solve this one chief",
				testing: "let's see how badly this fails"
			},
			neutral: {
				idle: "System ready.",
				productive: "Optimal productivity detected.",
				stuck: "Analyzing bottleneck...",
				testing: "Running tests..."
			}
		};

		class WebviewMusicEngine {
			constructor() {
				this.synth = null;
				this.reverb = null;
				this.filter = null;
				this.volume = null;
				this.currentLoop = null;
				this.isPlaying = false;
				this.currentMood = 'ambient';
			}

			async init() {
				await Tone.start();
				console.log('🎵 Music engine initialized');

				this.reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();
				await this.reverb.ready;

				this.filter = new Tone.Filter({ frequency: 2000, type: 'lowpass' });
				this.volume = new Tone.Volume(-20);

				this.synth = new Tone.PolySynth(Tone.Synth, {
					oscillator: { type: 'sine' },
					envelope: { attack: 2, decay: 0.5, sustain: 0.8, release: 3 }
				});

				this.synth.chain(this.filter, this.volume, this.reverb);
			}

			play(mood, activityLevel) {
				if (this.currentMood !== mood) {
					this.crossfade(mood);
				}
				
				this.adjustVolume(activityLevel);
				
				if (!this.isPlaying) {
					this.startLoop(mood);
				}
			}

			startLoop(mood) {
				if (this.currentLoop) {
					this.currentLoop.stop();
					this.currentLoop.dispose();
				}

				const patterns = {
					ambient: { notes: ['C3', 'E3', 'G3', 'B3'], duration: '2n', interval: 2, loop: '8n' },
					focused: { notes: ['D3', 'F3', 'A3', 'C4'], duration: '4n', interval: 1.5, loop: '4n' },
					energetic: { notes: ['E3', 'G3', 'B3', 'D4'], duration: '8n', interval: 0.5, loop: '2n' },
					calm: { notes: ['A2', 'C3', 'E3'], duration: '1n', interval: 3, loop: '1m' }
				};

				const pattern = patterns[mood] || patterns.ambient;

				this.currentLoop = new Tone.Loop((time) => {
					pattern.notes.forEach((note, i) => {
						this.synth.triggerAttackRelease(
							note,
							pattern.duration,
							time + i * pattern.interval
						);
					});
				}, pattern.loop);

				this.currentLoop.start(0);
				Tone.Transport.start();
				this.isPlaying = true;
				this.currentMood = mood;
			}

			adjustVolume(activityLevel) {
				const volumes = {
					idle: 0.15,
					low: 0.30,
					high: 0.70
				};

				const maxVol = parseInt(document.getElementById('maxVolume').value) / 100;
				const targetVol = Math.min(volumes[activityLevel] || 0.3, maxVol);
				currentVolume = targetVol;

				const db = targetVol === 0 ? -60 : 20 * Math.log10(targetVol);
				this.volume.volume.rampTo(db, 2);

				updateVolumeDisplay();
			}

			crossfade(newMood) {
				this.volume.volume.rampTo(-60, 5);
				setTimeout(() => {
					this.startLoop(newMood);
					const activityLevel = getCurrentActivityLevel();
					this.adjustVolume(activityLevel);
				}, 5000);
			}

			async celebrate(type = 'medium') {
				const synth = new Tone.PolySynth().toDestination();

				if (type === 'small') {
					const notes = ['C5', 'E5', 'G5'];
					const now = Tone.now();
					notes.forEach((note, i) => {
						synth.triggerAttackRelease(note, '8n', now + i * 0.1);
					});
				} else if (type === 'medium') {
					const sequence = [['C5', 'E5'], ['E5', 'G5'], ['G5', 'C6']];
					const now = Tone.now();
					sequence.forEach((chord, i) => {
						synth.triggerAttackRelease(chord, '8n', now + i * 0.15);
					});
				} else {
					const arpeggio = ['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6'];
					const now = Tone.now();
					arpeggio.forEach((note, i) => {
						synth.triggerAttackRelease(note, '16n', now + i * 0.1);
					});
					synth.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '2n', now + 0.8);
				}

				const flash = document.getElementById('celebrationFlash');
				flash.classList.add('active');
				setTimeout(() => flash.classList.remove('active'), 300);

				setTimeout(() => synth.dispose(), 3000);
			}

			stop() {
				this.isPlaying = false;
				if (this.currentLoop) {
					this.currentLoop.stop();
				}
				Tone.Transport.stop();
				if (this.volume) {
					this.volume.volume.rampTo(-60, 2);
				}
			}
		}

		class WebviewDialogueManager {
			constructor() {
				this.quotes = {
					triumph: [
						{ text: "To infinity and beyond!", source: "Buzz Lightyear" },
						{ text: "I am Iron Man", source: "Tony Stark" },
						{ text: "Avengers... assemble!", source: "Captain America" }
					],
					struggle: [
						{ text: "May the force be with you", source: "Star Wars" },
						{ text: "I have a bad feeling about this", source: "Star Wars" }
					],
					success: [
						{ text: "Just keep swimming", source: "Finding Nemo" },
						{ text: "Bond. James Bond.", source: "007" }
					],
					error: [
						{ text: "Houston, we have a problem", source: "Apollo 13" },
						{ text: "I've made a huge mistake", source: "Arrested Development" }
					]
				};
				this.lastQuote = 0;
				this.cooldown = 60 * 60 * 1000;
			}

			play(context, sessionDuration) {
				const enabled = document.getElementById('enableDialogue').checked;
				const frequency = document.getElementById('dialogueFrequency').value;

				if (!enabled || frequency === 'off' || sessionDuration < 15 * 60 * 1000) {
					return;
				}

				const now = Date.now();
				if (now - this.lastQuote < this.cooldown) {
					return;
				}

				const contextQuotes = this.quotes[context];
				if (!contextQuotes || contextQuotes.length === 0) return;

				const quote = contextQuotes[Math.floor(Math.random() * contextQuotes.length)];
				this.lastQuote = now;

				this.speak(quote);
			}

			speak(quote) {
				if ('speechSynthesis' in window) {
					const utterance = new SpeechSynthesisUtterance(quote.text);
					utterance.rate = 1.0;
					utterance.volume = 0.7;
					window.speechSynthesis.speak(utterance);
				}

				const msg = document.getElementById('message');
				const originalText = msg.textContent;
				msg.textContent = '💬 "' + quote.text + '" - ' + quote.source;
				
				setTimeout(() => {
					msg.textContent = originalText;
				}, 5000);
			}
		}

		async function initialize() {
			musicEngine = new WebviewMusicEngine();
			dialogueManager = new WebviewDialogueManager();
			
			try {
				await musicEngine.init();
				console.log('✅ Music engine ready');
			} catch (err) {
				console.error('❌ Music init failed:', err);
			}
		}

		function getCurrentActivityLevel() {
			const state = currentState;
			if (state === 'idle') return 'idle';
			if (state === 'stuck') return 'low';
			return 'high';
		}

		function updateDisplay() {
			document.getElementById('companion').textContent = vibeEmojis[currentVibe];
			document.getElementById('message').textContent = messages[currentVibe][currentState];
			document.getElementById('musicMood').textContent = 
				currentState.charAt(0).toUpperCase() + currentState.slice(1);
			updateVolumeDisplay();
		}

		function updateVolumeDisplay() {
			const volPercent = Math.round(currentVolume * 100);
			document.getElementById('state').textContent = 
				'State: ' + currentState + ' • Volume: ' + volPercent + '%';
		}

		document.querySelectorAll('.vibe-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				document.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				
				currentVibe = btn.dataset.vibe;
				updateDisplay();
				
				vscode.postMessage({
					command: 'vibeChanged',
					vibe: currentVibe
				});
			});
		});

		document.getElementById('maxVolume').addEventListener('input', (e) => {
			document.getElementById('volumeValue').textContent = e.target.value + '%';
			if (musicEngine && musicEngine.isPlaying) {
				musicEngine.adjustVolume(getCurrentActivityLevel());
			}
		});

		document.getElementById('dialogueFrequency').addEventListener('change', (e) => {
			const frequencies = {
				off: Infinity,
				rare: 60 * 60 * 1000,
				normal: 30 * 60 * 1000,
				frequent: 15 * 60 * 1000
			};
			if (dialogueManager) {
				dialogueManager.cooldown = frequencies[e.target.value];
			}
		});

		window.addEventListener('message', event => {
			const message = event.data;
			
			switch (message.command) {
				case 'initMusic':
					initialize();
					break;
					
				case 'playMusic':
					if (musicEngine) {
						musicEngine.play(message.mood, message.activity);
					}
					break;
					
				case 'stateChanged':
					currentState = message.state;
					updateDisplay();
					break;
					
				case 'celebrate':
					if (document.getElementById('enableCelebrations').checked && musicEngine) {
						musicEngine.celebrate(message.celebrationType);
					}
					break;
					
				case 'showDialogue':
					if (dialogueManager) {
						dialogueManager.play(message.context, message.sessionDuration);
					}
					break;
					
				case 'stopMusic':
					if (musicEngine) {
						musicEngine.stop();
					}
					break;
			}
		});

		window.addEventListener('load', () => {
			initialize();
			updateDisplay();
		});
	`;
}

export function deactivate() {
	if (diagnosticWatcher) {
		diagnosticWatcher.dispose();
	}
	if (stuckTimer) {
		clearTimeout(stuckTimer);
	}
}