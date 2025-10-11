import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/activityDetector';
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
	if (!dialogueManager) return;

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
			.controls {
				margin: 30px 0;
				display: flex;
				flex-direction: column;
				gap: 15px;
				align-items: center;
			}
			.control-row {
				display: flex;
				gap: 10px;
				align-items: center;
				width: 100%;
				max-width: 300px;
			}
			.control-btn {
				padding: 10px 20px;
				border: 1px solid var(--vscode-button-border);
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				cursor: pointer;
				border-radius: 4px;
				font-size: 11px;
				color: var(--vscode-descriptionForeground);
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
			
			<div class="music-status" id="musicStatus">
				🎵 Click a vibe button to start music
			</div>

			<div class="volume-control">
				<label for="volume">Volume</label>
				<input type="range" id="volume" min="-30" max="0" value="-12" step="1">
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

			// 🎵 MUSIC PATTERNS
			const musicPatterns = {
				idle: {
					notes: ['C4', 'E4', 'G4'],
					interval: '2n',
					tempo: 60
				},
				productive: {
					notes: ['C4', 'D4', 'E4', 'G4', 'A4', 'C5'],
					interval: '8n',
					tempo: 120
				},
				stuck: {
					notes: ['C4', 'D4', 'C4'],
					interval: '4n',
					tempo: 80
				},
				testing: {
					notes: ['C4', 'E4', 'G4', 'C5'],
					interval: '4n',
					tempo: 100
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

				const pattern = musicPatterns[state] || musicPatterns.idle;
				Tone.Transport.bpm.value = pattern.tempo;

				let index = 0;
				currentLoop = new Tone.Loop(time => {
					synth.triggerAttackRelease(pattern.notes[index], pattern.interval, time);
					index = (index + 1) % pattern.notes.length;
				}, pattern.interval).start(0);

					Tone.Transport.start();
					updateMusicStatus('Playing: ' + state + ' (' + pattern.tempo + ' BPM)');
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

			document.getElementById('stopBtn').addEventListener('click', () => stopMusic());
			document.getElementById('playBtn').addEventListener('click', async () => {
				if (!musicInitialized) await initMusic();
				if (!isPlaying) playMusicForState(currentState);
			});

			document.getElementById('volumeSlider').addEventListener('input', (e) => {
				const volume = parseInt(e.target.value);
				document.getElementById('volumeValue').textContent = volume + '%';
				if (synth) {
					synth.volume.value = (volume / 100) * 40 - 40;
				}
			});

			// Dialogue controls
			document.getElementById('dialogueToggle').addEventListener('change', (e) => {
				vscode.postMessage({ command: 'toggleDialogue', enabled: e.target.checked });
			});

			document.getElementById('dialogueFrequency').addEventListener('change', (e) => {
				vscode.postMessage({ command: 'setDialogueFrequency', frequency: e.target.value });
			});

			setInterval(() => {
				vscode.postMessage({ command: 'getMetrics' });
			}, 2000);

			// Stop button
			document.getElementById('stopBtn').addEventListener('click', () => {
				stopMusic();
			});

			// Play button
			document.getElementById('playBtn').addEventListener('click', async () => {
				if (!musicInitialized) {
					await initMusic();
				}
				if (!isPlaying) {
					playMusicForState(currentState);
				}
			});

			// Volume slider
			document.getElementById('volumeSlider').addEventListener('input', (e) => {
				const volume = parseInt(e.target.value);
				document.getElementById('volumeValue').textContent = volume + '%';
				
				if (synth) {
					// Convert 0-100 to decibels (-40 to 0)
					const db = (volume / 100) * 40 - 40;
					synth.volume.value = db;
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
						playMusicForState(currentState);
						break;
					case 'metrics':
						if (message.data) {
							document.getElementById('typingCount').textContent = message.data.typingCount;
							document.getElementById('idleTime').textContent = Math.floor(message.data.idleTime / 1000) + 's';
						}
						break;
					case 'metrics':
						if (message.data) {
							document.getElementById('typingCount').textContent = message.data.typingCount;
							const idleSeconds = Math.floor(message.data.idleTime / 1000);
							document.getElementById('idleTime').textContent = idleSeconds + 's';
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