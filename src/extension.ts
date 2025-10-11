import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/ActivityDetector';
import { MusicEngine } from './music/musicEngine';
import { DialogueManager, DialogueContext } from './music/dialogueManager';
import { TestRunner } from './detection/TestRunner';
import { getAnimationFrame, getAnimationLength } from './utils/asciiArt';
import { MusicData, ActivityState, VibeMode } from './types';

let activityDetector: ActivityDetector | undefined;
let musicEngine: MusicEngine | undefined;
let dialogueManager: DialogueManager | undefined;
let testRunner: TestRunner | undefined;
let currentPanel: vscode.WebviewPanel | undefined;
let animationInterval: NodeJS.Timeout | undefined;
let sessionStartTime: number = Date.now();

export function activate(context: vscode.ExtensionContext) {
	console.log('Vibe-Driven Development extension activated! 🎵');

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

		currentPanel.webview.html = getWebviewContent(context, currentPanel.webview);

		// Initialize Music Engine
		musicEngine = new MusicEngine((data: MusicData) => {
			currentPanel?.webview.postMessage(data);
		});

		activityDetector = new ActivityDetector((newState) => {
			console.log('📡 Activity state changed:', newState);

			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: newState
			});

			musicEngine?.playStateMusic(newState);
		});

		testRunner = new TestRunner(activityDetector);

		currentPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'vibeChanged':
						console.log('Vibe changed to:', message.vibe);
						musicEngine?.setVibe(message.vibe);
						// Restart animation with new vibe
						if (activityDetector) {
							const currentState = getCurrentState();
							startAnimation(currentState, message.vibe);
						}
						break;
					case 'requestHint':
						currentPanel?.webview.postMessage({
							command: 'hint',
							text: 'Try breaking this into smaller functions!'
						});
						break;
					case 'musicStatus':
						console.log('Music status:', message.status);
						break;
					case 'getMetrics':
						if (activityDetector) {
							const metrics = activityDetector.getMetrics();
							currentPanel?.webview.postMessage({
								command: 'metrics',
								data: metrics
							});
						}
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
			activityDetector?.dispose();
			musicEngine?.dispose();
			testRunner?.dispose();
			if (animationInterval) {
				clearInterval(animationInterval);
			}
		});
	});

	context.subscriptions.push(showCompanion);

	// Auto-show on startup
	vscode.commands.executeCommand('vibe-driven-development.showCompanion');
}

function getCurrentState(): ActivityState {
	// Helper to get current state from detector
	return 'idle'; // Default, will be updated by actual state
}

function startAnimation(state: ActivityState, vibe: VibeMode) {
	if (animationInterval) {
		clearInterval(animationInterval);
	}

	const animLength = getAnimationLength(vibe, state);
	let frameIndex = 0;

	// Update animation frame
	const updateFrame = () => {
		const frame = getAnimationFrame(vibe, state, frameIndex);
		currentPanel?.webview.postMessage({
			command: 'updateCompanion',
			emoji: frame
		});
		frameIndex = (frameIndex + 1) % animLength;
	};

	// Initial frame
	updateFrame();

	// Animate every 500ms
	animationInterval = setInterval(updateFrame, 500);
}

async function handleDialogue(state: ActivityState) {
	if (!dialogueManager) {return;}

	const sessionDuration = Date.now() - sessionStartTime;
	let context: DialogueContext | null = null;

	// Map activity states to dialogue contexts
	switch (state) {
		case 'test_passed':
			context = 'triumph';
			break;
		case 'test_failed':
			context = 'error';
			break;
		case 'stuck':
			context = 'struggle';
			break;
		case 'productive':
			context = 'success';
			break;
		case 'idle':
			context = 'motivation';
			break;
	}

	if (context) {
		const quote = await dialogueManager.playDialogue(context, sessionDuration);
		if (quote) {
			currentPanel?.webview.postMessage({
				command: 'showQuote',
				quote: quote
			});
		}
	}
}

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
		<title>Vibe Companion</title>
		<style>
			* { margin: 0; padding: 0; box-sizing: border-box; }
			body {
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background: var(--vscode-editor-background);
				padding: 20px;
				overflow-y: auto;
			}
			.container { 
				max-width: 500px; 
				margin: 0 auto; 
				text-align: center; 
			}
			h1 { 
				margin-bottom: 20px; 
				font-size: 24px; 
			}
			.vibe-selector {
				display: flex;
				gap: 10px;
				margin: 20px 0;
				justify-content: center;
				flex-wrap: wrap;
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
				animation: float 3s ease-in-out infinite;
				user-select: none;
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
			}
			.state {
				font-size: 12px;
				color: var(--vscode-descriptionForeground);
				margin-top: 10px;
			}
			.idle-time {
				font-size: 18px;
				font-weight: bold;
				color: var(--vscode-foreground);
				margin: 15px 0;
				text-align: center;
			}
			.controls {
				margin: 20px 0;
				display: flex;
				gap: 10px;
				justify-content: center;
			}
			.control-btn {
				padding: 10px 20px;
				border: 1px solid var(--vscode-button-border);
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				cursor: pointer;
				border-radius: 4px;
				font-size: 14px;
				transition: all 0.2s;
			}
			.control-btn:hover {
				background: var(--vscode-button-hoverBackground);
			}
			.control-btn:active {
				transform: scale(0.95);
			}
			.volume-control {
				margin-top: 15px;
			}
			.volume-control label {
				display: block;
				margin-bottom: 5px;
				font-size: 12px;
			}
			.volume-control input {
				width: 200px;
			}
			.advanced-controls {
				margin-top: 20px;
				display: flex;
				flex-direction: column;
				gap: 15px;
			}
			.control-group {
				display: flex;
				align-items: center;
				gap: 10px;
			}
			.control-group label {
				min-width: 60px;
				font-size: 12px;
			}
			.control-group input[type="range"] {
				width: 120px;
			}
			.control-group select {
				padding: 4px 8px;
				border: 1px solid var(--vscode-button-border);
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border-radius: 3px;
			}
		</style>
	</head>
	<body>
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

			<div class="state" id="state">State: idle</div>

			<div class="idle-time" id="idleTime">Idle: 0s</div>

			<div class="music-status" id="musicStatus">
				🎵 Click a vibe button to start music
			</div>

			<div class="controls">
				<button class="control-btn" id="playBtn">▶️ Play</button>
				<button class="control-btn" id="stopBtn">⏹️ Stop</button>
			</div>

			<div class="volume-control">
				<label for="volume">Volume</label>
				<input type="range" id="volume" min="-30" max="0" value="-12" step="1">
			</div>

			<div class="advanced-controls">
				<div class="control-group">
					<label for="speed">Speed</label>
					<input type="range" id="speed" min="0.5" max="2" value="1" step="0.1">
					<span id="speedValue">1.0x</span>
				</div>
				<div class="control-group">
					<label for="rhythm">Rhythm</label>
					<select id="rhythm">
						<option value="normal">Normal</option>
						<option value="syncopated">Syncopated</option>
						<option value="swing">Swing</option>
						<option value="random">Random</option>
					</select>
				</div>
				<div class="control-group">
					<label for="beats">Beats</label>
					<select id="beats">
						<option value="4">4/4</option>
						<option value="3">3/4</option>
						<option value="6">6/8</option>
						<option value="5">5/4</option>
					</select>
				</div>
			</div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();
			
			let currentVibe = 'encouraging';
			let currentState = 'idle';
			let musicInitialized = false;
			let currentLoop = null;
			let synth = null;
			let isPlaying = false;
			let speedMultiplier = 1;
			let rhythmType = 'normal';
			let beatsPerMeasure = 4;

			// 🎵 MUSIC SETUP
			async function initMusic() {
				if (musicInitialized) return;
				
				try {
					await Tone.start();
					console.log('🎵 Audio context started');
					
					// Create synth
					synth = new Tone.PolySynth(Tone.Synth, {
						oscillator: { type: 'sine' },
						envelope: {
							attack: 0.1,
							decay: 0.2,
							sustain: 0.3,
							release: 1
						}
					}).toDestination();
					
					synth.volume.value = -12;
					musicInitialized = true;
				} catch (error) {
					console.error('Failed to initialize music:', error);
				}
			}

			// 🎵 MUSIC CONFIGS (from task requirements)
			const musicConfigs = {
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

			// 🎵 PLAY MUSIC FOR STATE
			function playMusicForState(state) {
				if (!musicInitialized) {
					return;
				}

				try {
					// Stop current loop
					if (currentLoop) {
						currentLoop.stop();
						currentLoop.dispose();
						currentLoop = null;
					}

					const configKey = state + '-' + currentVibe;
					const config = musicConfigs[configKey] || musicConfigs['idle-encouraging'];

					// Apply speed multiplier
					Tone.Transport.bpm.value = config.tempo * speedMultiplier;

					// Set synth volume
					synth.volume.value = config.volume;

					let index = 0;
					let patternIndex = 0;

					// Convert duration to Tone.js format
					const durationMap = {
						'16n': '16n',
						'8n': '8n',
						'4n': '4n',
						'2n': '2n',
						'1n': '1n'
					};
					let interval = durationMap[config.duration] || '4n';

					// Apply rhythm modifications
					switch (rhythmType) {
						case 'syncopated':
							interval = Tone.Time(interval).mult(1.5).toString();
							break;
						case 'swing':
							interval = Tone.Time(interval).mult(0.75).toString();
							break;
						case 'random':
							// Will be handled in the loop
							break;
					}

					currentLoop = new Tone.Loop(time => {
						let note = config.notes[index];
						let actualInterval = interval;

						// Apply rhythm randomness
						if (rhythmType === 'random') {
							actualInterval = Math.random() > 0.7 ? Tone.Time(interval).mult(2).toString() : interval;
						}

						// Apply pattern logic
						switch (config.pattern) {
							case 'arpeggio':
								note = config.notes[patternIndex % config.notes.length];
								patternIndex++;
								break;
							case 'ascending':
								note = config.notes[Math.min(patternIndex, config.notes.length - 1)];
								patternIndex = (patternIndex + 1) % (config.notes.length * 2);
								break;
							case 'descending':
								note = config.notes[config.notes.length - 1 - (patternIndex % config.notes.length)];
								patternIndex++;
								break;
							case 'chord':
								// Play all notes as chord
								config.notes.forEach(n => {
									synth.triggerAttackRelease(n, actualInterval, time);
								});
								index = (index + 1) % config.notes.length;
								return;
						}

						synth.triggerAttackRelease(note, actualInterval, time);
						index = (index + 1) % config.notes.length;
					}, interval).start(0);

					Tone.Transport.start();
					updateMusicStatus('Playing: ' + state + ' (' + config.tempo + ' BPM) - ' + config.mood);
				} catch (error) {
					console.error('Error playing music:', error);
					updateMusicStatus('Playback error: ' + error.message);
				}
			}

			// Volume control
			document.getElementById('volume').addEventListener('input', (e) => {
				if (synth) {
					synth.volume.value = parseInt(e.target.value);
					updateMusicStatus('Volume: ' + e.target.value + ' dB');
				}
			});

			const vibeEmojis = {
				encouraging: '😊',
				roasting: '😏',
				neutral: '🤖'
			};

			// Messages
			const messages = {
				encouraging: {
					idle: "Ready when you are! 💪",
					productive: "You're crushing it! 🔥",
					stuck: "Take a breath, you got this! 🌟",
					testing: "Fingers crossed! 🤞",
					test_passed: "YES! I knew you could do it! 🎉",
					test_failed: "It's okay, we'll fix it together! 💙"
				},
				roasting: {
					idle: "gonna code or just stare? 👀",
					productive: "wow actually working for once",
					stuck: "stackoverflow isn't gonna solve this one chief",
					testing: "let's see how badly this fails",
					test_passed: "finally lmao 💀",
					test_failed: "skill issue fr fr"
				},
				neutral: {
					idle: "System ready.",
					productive: "Optimal productivity detected.",
					stuck: "Analyzing bottleneck...",
					testing: "Running tests...",
					test_passed: "Tests passing. Continuing.",
					test_failed: "Test failure. Debugging recommended."
				}
			};

			// Update display
			function updateDisplay() {
				document.getElementById('message').textContent = messages[currentVibe][currentState];
				document.getElementById('state').textContent = 'State: ' + currentState;
			}

			// Vibe buttons
			document.querySelectorAll('.vibe-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					// Initialize music on first interaction
					if (!musicInitialized) {
						await initMusic();
						playMusicForState(currentState);
					}

					document.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					
					currentVibe = btn.dataset.vibe;
					updateDisplay();
					
					vscode.postMessage({ command: 'vibeChanged', vibe: currentVibe });
				});
			});

			// Stop music function
			function stopMusic() {
				if (currentLoop) {
					currentLoop.stop();
					currentLoop.dispose();
					currentLoop = null;
				}
				Tone.Transport.stop();
				isPlaying = false;
				updateMusicStatus('Music stopped');
				document.getElementById('playBtn').style.display = 'inline-block';
				document.getElementById('stopBtn').style.display = 'none';
			}

			// Play/Stop buttons
			document.getElementById('playBtn').addEventListener('click', async () => {
				if (!musicInitialized) await initMusic();
				if (!isPlaying) {
					playMusicForState(currentState);
					isPlaying = true;
					document.getElementById('playBtn').style.display = 'none';
					document.getElementById('stopBtn').style.display = 'inline-block';
				}
			});

			document.getElementById('stopBtn').addEventListener('click', () => {
				stopMusic();
			});

			// Advanced controls
			document.getElementById('speed').addEventListener('input', (e) => {
				speedMultiplier = parseFloat(e.target.value);
				document.getElementById('speedValue').textContent = speedMultiplier.toFixed(1) + 'x';
				if (isPlaying) {
					playMusicForState(currentState); // Restart with new speed
				}
			});

			document.getElementById('rhythm').addEventListener('change', (e) => {
				rhythmType = e.target.value;
				if (isPlaying) {
					playMusicForState(currentState); // Restart with new rhythm
				}
			});

			document.getElementById('beats').addEventListener('change', (e) => {
				beatsPerMeasure = parseInt(e.target.value);
				if (isPlaying) {
					playMusicForState(currentState); // Restart with new beats
				}
			});

			// Request metrics every 2 seconds
			setInterval(() => {
				vscode.postMessage({ command: 'getMetrics' });
			}, 2000);

			// Listen for messages from extension
			window.addEventListener('message', event => {
				const message = event.data;

				switch (message.command) {
					case 'stateChanged':
						currentState = message.state;
						updateDisplay();
						if (isPlaying) {
							playMusicForState(currentState);
						}
						break;
					case 'metrics':
						if (message.data) {
							const idleSeconds = Math.floor(message.data.idleTime / 1000);
							const idleMinutes = Math.floor(idleSeconds / 60);
							const idleDisplay = idleMinutes > 0 ?
								idleMinutes + 'm ' + (idleSeconds % 60) + 's' :
								idleSeconds + 's';
							document.getElementById('idleTime').textContent = 'Idle: ' + idleDisplay;
						}
						break;
				}
			});

			updateDisplay();
		</script>
	</body>
	</html>`;
}

export function deactivate() {
	activityDetector?.dispose();
	musicEngine?.dispose();
	testRunner?.dispose();
	if (animationInterval) {
		clearInterval(animationInterval);
	}
}