// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/activityDetector';
import { MusicEngine } from './music/musicEngine';
import { MusicData } from './types';

let activityDetector: ActivityDetector | undefined;
let musicEngine: MusicEngine | undefined;
let currentPanel: vscode.WebviewPanel | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

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

		// 🟢 Initialize Music Engine
		musicEngine = new MusicEngine((data: MusicData) => {
			currentPanel?.webview.postMessage(data);
		});

		// 🟢 Initialize Activity Detector
		activityDetector = new ActivityDetector((newState) => {
			console.log('📡 Activity state changed:', newState);

			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: newState
			});

			musicEngine?.playStateMusic(newState);
		});

		// 🟢 Handle messages from Webview
		currentPanel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'vibeChanged':
						console.log('Vibe changed to:', message.vibe);
						musicEngine?.setVibe(message.vibe);
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
		<title>VibeCode</title>
		<style>
			/* ... your existing styles ... */
		</style>
	</head>
	<body>
		<!-- ... your existing HTML ... -->

		<script>
			const vscode = acquireVsCodeApi();
			
			let currentVibe = 'encouraging';
			let currentState = 'idle';
			let musicInitialized = false;
			let currentLoop = null;
			let synth = null;

			// 🎵 MUSIC SETUP
			async function initMusic() {
				if (musicInitialized) return;
				
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
				
				synth.volume.value = -12; // Quieter background music
				
				musicInitialized = true;
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
					initMusic();
					return;
				}

				// Stop current loop
				if (currentLoop) {
					currentLoop.stop();
					currentLoop.dispose();
				}

				const pattern = musicPatterns[state] || musicPatterns.idle;
				Tone.Transport.bpm.value = pattern.tempo;

				let index = 0;
				currentLoop = new Tone.Loop(time => {
					synth.triggerAttackRelease(pattern.notes[index], pattern.interval, time);
					index = (index + 1) % pattern.notes.length;
				}, pattern.interval).start(0);

				Tone.Transport.start();
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
				document.getElementById('companion').textContent = vibeEmojis[currentVibe];
				document.getElementById('message').textContent = messages[currentVibe][currentState];
				document.getElementById('state').textContent = 'State: ' + currentState;
			}

			// Vibe buttons - ADD MUSIC INIT ON CLICK
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

			// Listen for messages from extension
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

// This method is called when your extension is deactivated
export function deactivate() {
	activityDetector?.dispose();
	musicEngine?.dispose();
}