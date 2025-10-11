import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/ActivityDetector';
import { MusicEngine } from './music/musicEngine';
import { MusicData } from './types';

let activityDetector: ActivityDetector | undefined;
let musicEngine: MusicEngine | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vibe-driven-development" is now active!');

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

		// Initialize Activity Detector
		activityDetector = new ActivityDetector((newState) => {
			console.log('📡 Activity state changed:', newState);

			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: newState
			});

			musicEngine?.playStateMusic(newState);
		});

		// Handle messages from Webview
		currentPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'vibeChanged':
						console.log('Vibe changed to:', message.vibe);
						musicEngine?.setVibe(message.vibe);
						break;
					case 'requestHint':
						currentPanel?.webview.postMessage({
							command: 'hint',
							text: 'Try breaking this into smaller functions!'
						});
						break;
					case 'getMetrics':
						const metrics = activityDetector?.getMetrics();
						currentPanel?.webview.postMessage({
							command: 'metrics',
							data: metrics
						});
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
		});
	});

	context.subscriptions.push(showCompanion);

	// Auto-show on startup
	vscode.commands.executeCommand('vibe-driven-development.showCompanion');
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
				font-size: 14px;
			}
			.control-btn:hover {
				background: var(--vscode-button-hoverBackground);
			}
			.control-btn.stop {
				background: var(--vscode-errorForeground);
				color: white;
			}
			.volume-control {
				display: flex;
				align-items: center;
				gap: 10px;
				width: 100%;
			}
			.volume-slider {
				flex: 1;
				height: 4px;
				-webkit-appearance: none;
				appearance: none;
				background: var(--vscode-button-border);
				outline: none;
				border-radius: 2px;
			}
			.volume-slider::-webkit-slider-thumb {
				-webkit-appearance: none;
				appearance: none;
				width: 16px;
				height: 16px;
				background: var(--vscode-button-background);
				border: 2px solid var(--vscode-focusBorder);
				cursor: pointer;
				border-radius: 50%;
			}
			.volume-slider::-moz-range-thumb {
				width: 16px;
				height: 16px;
				background: var(--vscode-button-background);
				border: 2px solid var(--vscode-focusBorder);
				cursor: pointer;
				border-radius: 50%;
			}
			.volume-label {
				font-size: 12px;
				min-width: 50px;
			}
			.metrics {
				margin-top: 20px;
				padding: 15px;
				background: var(--vscode-editor-inactiveSelectionBackground);
				border-radius: 8px;
				font-size: 12px;
				text-align: left;
			}
			.metrics-row {
				display: flex;
				justify-content: space-between;
				margin: 5px 0;
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

			<div class="state" id="state">
				State: idle
			</div>

			<div class="controls">
				<div class="control-row">
					<button class="control-btn stop" id="stopBtn">⏹️ Stop Music</button>
					<button class="control-btn" id="playBtn">▶️ Play</button>
				</div>
				
				<div class="volume-control">
					<span class="volume-label">🔊 Volume:</span>
					<input type="range" id="volumeSlider" class="volume-slider" min="0" max="100" value="50">
					<span class="volume-label" id="volumeValue">50%</span>
				</div>
			</div>

			<div class="metrics" id="metrics">
				<div class="metrics-row">
					<span>Typing Count:</span>
					<span id="typingCount">0</span>
				</div>
				<div class="metrics-row">
					<span>Idle Time:</span>
					<span id="idleTime">0s</span>
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
				},
				procrastinating: {
					notes: ['C4', 'C4'],
					interval: '1n',
					tempo: 40
				},
				building: {
					notes: ['C4', 'E4', 'G4', 'B4', 'D5'],
					interval: '16n',
					tempo: 140
				},
				test_passed: {
					notes: ['C5', 'E5', 'G5', 'C6'],
					interval: '16n',
					tempo: 160
				},
				test_failed: {
					notes: ['C4', 'B3', 'A3', 'G3'],
					interval: '8n',
					tempo: 60
				}
			};

			// 🎵 PLAY MUSIC FOR STATE
			function playMusicForState(state) {
				if (!musicInitialized) {
					return;
				}

				// Stop current loop
				stopMusic();

				const pattern = musicPatterns[state] || musicPatterns.idle;
				Tone.Transport.bpm.value = pattern.tempo;

				let index = 0;
				currentLoop = new Tone.Loop(time => {
					synth.triggerAttackRelease(pattern.notes[index], pattern.interval, time);
					index = (index + 1) % pattern.notes.length;
				}, pattern.interval).start(0);

				Tone.Transport.start();
				isPlaying = true;
			}

			// Stop music
			function stopMusic() {
				if (currentLoop) {
					currentLoop.stop();
					currentLoop.dispose();
					currentLoop = null;
				}
				Tone.Transport.stop();
				isPlaying = false;
			}

			// Vibe emojis
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
					procrastinating: "I believe in you! Let's do this! 🚀",
					building: "Building something amazing! ⚡",
					test_passed: "YES! I knew you could do it! 🎉",
					test_failed: "It's okay, we'll fix it together! 💙"
				},
				roasting: {
					idle: "gonna code or just stare? 👀",
					productive: "wow actually working for once",
					stuck: "stackoverflow isn't gonna solve this one chief",
					testing: "let's see how badly this fails",
					procrastinating: "twitter won't code itself... wait",
					building: "hope you saved your work 🔥",
					test_passed: "finally lmao 💀",
					test_failed: "skill issue fr fr"
				},
				neutral: {
					idle: "System ready.",
					productive: "Optimal productivity detected.",
					stuck: "Analyzing bottleneck...",
					testing: "Running tests...",
					procrastinating: "Activity level: low.",
					building: "Build in progress.",
					test_passed: "Tests passing. Continuing.",
					test_failed: "Test failure. Debugging recommended."
				}
			};

			// Update display
			function updateDisplay() {
				document.getElementById('companion').textContent = vibeEmojis[currentVibe];
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
					
					vscode.postMessage({
						command: 'vibeChanged',
						vibe: currentVibe
					});
				});
			});

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
						if (musicInitialized && isPlaying) {
							playMusicForState(currentState);
						}
						break;
					case 'hint':
						console.log('Hint:', message.text);
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
}