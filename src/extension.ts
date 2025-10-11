import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/activityDetector';
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
		});
	});

	context.subscriptions.push(showCompanion);
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
				max-width: 400px; 
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
			.music-status {
				margin-top: 10px;
				padding: 10px;
				background: var(--vscode-input-background);
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

			function updateMusicStatus(status) {
				document.getElementById('musicStatus').textContent = '🎵 ' + status;
				vscode.postMessage({ command: 'musicStatus', status });
			}

			async function initMusic() {
				if (musicInitialized) return;
				
				try {
					updateMusicStatus('Initializing...');
					await Tone.start();
					console.log('🎵 Audio context started');
					
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
					updateMusicStatus('Music ready!');
					
					// Start playing immediately
					playMusicForState(currentState);
				} catch (error) {
					console.error('Failed to initialize music:', error);
					updateMusicStatus('Error: ' + error.message);
				}
			}

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
						if (synth) {
							synth.triggerAttackRelease(pattern.notes[index], pattern.interval, time);
						}
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

			function updateDisplay() {
				document.getElementById('companion').textContent = vibeEmojis[currentVibe];
				document.getElementById('message').textContent = messages[currentVibe][currentState];
				document.getElementById('state').textContent = 'State: ' + currentState;
			}

			document.querySelectorAll('.vibe-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					if (!musicInitialized) {
						await initMusic();
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

			window.addEventListener('message', event => {
				const message = event.data;
				
				switch (message.command) {
					case 'stateChanged':
						currentState = message.state;
						updateDisplay();
						playMusicForState(currentState);
						break;
					case 'hint':
						console.log('Hint:', message.text);
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