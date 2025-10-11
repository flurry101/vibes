// src/extension.ts - REPLACE YOUR ENTIRE FILE WITH THIS

import * as vscode from 'vscode';
import * as path from 'path';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Vibe Driven Development is now active!');

	// Get API key from settings
	const config = vscode.workspace.getConfiguration('vibe-driven-development');
	const apiKey = config.get<string>('anthropicApiKey') || '';

	if (!apiKey) {
		vscode.window.showWarningMessage(
			'VDD: Please set your Anthropic API key in settings',
			'Open Settings'
		).then(selection => {
			if (selection === 'Open Settings') {
				vscode.commands.executeCommand('workbench.action.openSettings', 'vibe-driven-development.anthropicApiKey');
			}
		});
	}

	// Command to show companion
	let showCompanion = vscode.commands.registerCommand('vibe-driven-development.showCompanion', () => {
		if (currentPanel) {
			currentPanel.reveal(vscode.ViewColumn.Two);
		} else {
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

			currentPanel.webview.html = getWebviewContent(apiKey);

			// Handle messages from webview
			currentPanel.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
						case 'vibeChanged':
							console.log('✨ Vibe changed to:', message.vibe);
							break;
						case 'stateChanged':
							console.log('📊 State changed to:', message.state);
							break;
						case 'musicInitialized':
							console.log('🎵 Music generator ready');
							break;
						case 'musicError':
							vscode.window.showErrorMessage(`Music error: ${message.error}`);
							break;
						case 'musicPlaying':
							console.log('🎶 Playing:', message.params);
							break;
					}
				},
				undefined,
				context.subscriptions
			);

			currentPanel.onDidDispose(() => {
				currentPanel = undefined;
			});
		}
	});

	context.subscriptions.push(showCompanion);

	// Auto-show on startup
	vscode.commands.executeCommand('vibe-driven-development.showCompanion');

	// Activity detection
	let lastActivity = Date.now();
	let typingCount = 0;

	vscode.workspace.onDidChangeTextDocument(e => {
		lastActivity = Date.now();
		typingCount++;

		// Detect productive state (10+ keystrokes)
		if (typingCount >= 10) {
			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: 'productive'
			});
			typingCount = 0; // Reset counter
		}
	});

	// Check for idle/stuck every 10 seconds
	const idleChecker = setInterval(() => {
		if (!currentPanel) {
			return;
		}

		const idleTime = Date.now() - lastActivity;
		
		if (idleTime > 30000) {
			// Been idle for 30+ seconds
			currentPanel.webview.postMessage({
				command: 'stateChanged',
				state: 'idle'
			});
		} else if (idleTime > 10000 && idleTime < 30000) {
			// Been idle 10-30 seconds (might be stuck/thinking)
			currentPanel.webview.postMessage({
				command: 'stateChanged',
				state: 'stuck'
			});
		}
	}, 10000);

	context.subscriptions.push({ dispose: () => clearInterval(idleChecker) });
}

function getWebviewContent(apiKey: string): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Vibe Companion</title>
		<style>
			* { margin: 0; padding: 0; box-sizing: border-box; }
			body {
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background: var(--vscode-editor-background);
				padding: 20px;
			}
			.container { max-width: 400px; margin: 0 auto; text-align: center; }
			h1 { margin-bottom: 20px; font-size: 24px; }
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
			.music-toggle {
				margin: 20px 0;
			}
			.debug {
				margin-top: 20px;
				padding: 10px;
				background: var(--vscode-textCodeBlock-background);
				border-radius: 4px;
				font-size: 11px;
				font-family: monospace;
				text-align: left;
				max-height: 150px;
				overflow-y: auto;
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

			<div class="music-toggle">
				<button class="vibe-btn" id="musicToggle">🔊 Music ON</button>
			</div>

			<div class="companion" id="companion">😊</div>
			
			<div class="message" id="message">
				Initializing...
			</div>

			<div class="state" id="state">
				State: initializing
			</div>

			<div class="debug" id="debug">
				<div>🎵 Debug Log:</div>
			</div>
		</div>

		<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
		<script>
			const vscode = acquireVsCodeApi();
			const API_KEY = '${apiKey}';
			
			let currentVibe = 'encouraging';
			let currentState = 'idle';
			let musicEnabled = true;
			let musicInitialized = false;
			let synth = null;
			let currentLoop = null;

			// Debug logger
			function log(msg) {
				const debug = document.getElementById('debug');
				const time = new Date().toLocaleTimeString();
				debug.innerHTML += '<div>' + time + ': ' + msg + '</div>';
				debug.scrollTop = debug.scrollHeight;
				console.log(msg);
			}

			// Initialize Tone.js
			async function initMusic() {
				try {
					log('🎵 Starting Tone.js...');
					await Tone.start();
					
					synth = new Tone.PolySynth(Tone.Synth).toDestination();
					synth.volume.value = -10;
					
					musicInitialized = true;
					log('✅ Music ready!');
					document.getElementById('message').textContent = 'Ready to vibe!';
					document.getElementById('state').textContent = 'State: idle';
					
					vscode.postMessage({ command: 'musicInitialized' });
				} catch (error) {
					log('❌ Music init failed: ' + error.message);
					vscode.postMessage({ 
						command: 'musicError', 
						error: error.message 
					});
				}
			}

			// Music toggle button
			document.getElementById('musicToggle').addEventListener('click', async () => {
				if (!musicInitialized) {
					await initMusic();
				}
				
				musicEnabled = !musicEnabled;
				document.getElementById('musicToggle').textContent = 
					musicEnabled ? '🔊 Music ON' : '🔇 Music OFF';
				
				if (!musicEnabled) {
					stopMusic();
				}
				
				log(musicEnabled ? '🔊 Music enabled' : '🔇 Music muted');
			});

			// Generate music params using AI
			async function generateMusicParams(state, vibe) {
				if (!API_KEY || API_KEY === '') {
					log('⚠️ No API key, using fallback');
					return getFallbackParams(state, vibe);
				}

				const prompt = \`You are a music composer AI. Generate musical parameters for a coding companion.

State: \${state}
Vibe: \${vibe}

Return ONLY a JSON object:
{
  "tempo": <60-180>,
  "notes": ["C4", "E4", "G4"],
  "duration": "4n",
  "pattern": "chord",
  "volume": -10,
  "mood": "description"
}

Pattern options: chord, ascending, descending, arpeggio
Duration options: 8n, 4n, 2n, 1n\`;

				try {
					log('🤖 Asking AI for music...');
					
					const response = await fetch('https://api.anthropic.com/v1/messages', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-api-key': API_KEY,
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
					const text = data.content[0].text;
					const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
					
					if (!jsonMatch) {
						throw new Error('No JSON in response');
					}
					
					const params = JSON.parse(jsonMatch[0]);
					log('✅ AI generated: ' + params.mood);
					return params;
					
				} catch (error) {
					log('⚠️ AI failed, using fallback: ' + error.message);
					return getFallbackParams(state, vibe);
				}
			}

			// Fallback music params
			function getFallbackParams(state, vibe) {
				const presets = {
					'productive-encouraging': {
						tempo: 120, notes: ['C4', 'E4', 'G4'], duration: '4n', pattern: 'chord', volume: -10, mood: 'upbeat'
					},
					'stuck-encouraging': {
						tempo: 80, notes: ['A3', 'C4', 'E4'], duration: '2n', pattern: 'chord', volume: -15, mood: 'calm'
					},
					'idle-encouraging': {
						tempo: 70, notes: ['C3', 'G3'], duration: '1n', pattern: 'chord', volume: -20, mood: 'ambient'
					},
					'productive-roasting': {
						tempo: 130, notes: ['C4', 'Eb4', 'Gb4'], duration: '8n', pattern: 'arpeggio', volume: -12, mood: 'quirky'
					},
					'stuck-roasting': {
						tempo: 85, notes: ['E4', 'Eb4', 'D4'], duration: '4n', pattern: 'descending', volume: -15, mood: 'sarcastic'
					}
				};

				const key = state + '-' + vibe;
				return presets[key] || presets['idle-encouraging'];
			}

			// Play music from params
			function playMusic(params) {
				if (!musicInitialized || !musicEnabled) {
					return;
				}

				stopMusic();

				try {
					synth.volume.value = params.volume;
					Tone.Transport.bpm.value = params.tempo;

					const { notes, duration, pattern } = params;

					if (pattern === 'chord') {
						currentLoop = new Tone.Loop((time) => {
							synth.triggerAttackRelease(notes, duration, time);
						}, duration === '8n' ? '2n' : '1n');
						currentLoop.start(0);
					} else if (pattern === 'ascending' || pattern === 'descending') {
						const seq = pattern === 'descending' ? [...notes].reverse() : notes;
						const sequence = new Tone.Sequence((time, note) => {
							synth.triggerAttackRelease(note, duration, time);
						}, seq, duration);
						sequence.start(0);
					} else if (pattern === 'arpeggio') {
						const arp = [...notes, ...notes.slice().reverse().slice(1, -1)];
						const sequence = new Tone.Sequence((time, note) => {
							synth.triggerAttackRelease(note, duration, time);
						}, arp, duration);
						sequence.start(0);
					}

					Tone.Transport.start();
					log('🎶 Playing: ' + params.mood + ' (' + params.tempo + ' BPM)');
					
					vscode.postMessage({ 
						command: 'musicPlaying',
						params: params
					});
					
				} catch (error) {
					log('❌ Play error: ' + error.message);
				}
			}

			// Stop music
			function stopMusic() {
				if (currentLoop) {
					currentLoop.stop();
					currentLoop.dispose();
					currentLoop = null;
				}
				Tone.Transport.stop();
				Tone.Transport.cancel(0);
			}

			// Vibe emojis and messages
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
				},
				roasting: {
					idle: "gonna code or just stare? 👀",
					productive: "wow actually working for once",
					stuck: "stackoverflow isn't gonna solve this one chief",
				},
				neutral: {
					idle: "System ready.",
					productive: "Optimal productivity detected.",
					stuck: "Analyzing bottleneck...",
				}
			};

			// Update display
			function updateDisplay() {
				document.getElementById('companion').textContent = vibeEmojis[currentVibe];
				document.getElementById('message').textContent = messages[currentVibe][currentState];
				document.getElementById('state').textContent = 'State: ' + currentState;
			}

			// Vibe buttons
			document.querySelectorAll('.vibe-btn[data-vibe]').forEach(btn => {
				btn.addEventListener('click', async () => {
					// Initialize music on first interaction
					if (!musicInitialized) {
						await initMusic();
					}

					document.querySelectorAll('.vibe-btn[data-vibe]').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
					
					currentVibe = btn.dataset.vibe;
					updateDisplay();
					
					log('✨ Vibe changed to: ' + currentVibe);
					
					vscode.postMessage({
						command: 'vibeChanged',
						vibe: currentVibe
					});

					// Regenerate music for current state with new vibe
					const params = await generateMusicParams(currentState, currentVibe);
					playMusic(params);
				});
			});

			// Listen for state changes from extension
			window.addEventListener('message', async event => {
				const message = event.data;
				
				if (message.command === 'stateChanged') {
					const newState = message.state;
					
					if (newState !== currentState) {
						currentState = newState;
						updateDisplay();
						
						log('📊 State: ' + currentState);
						
						// Generate and play new music
						const params = await generateMusicParams(currentState, currentVibe);
						playMusic(params);
					}
				}
			});

			// Initialize display
			updateDisplay();
			log('🚀 Vibe Companion ready!');
			log('⚠️ Click music button to start');
		</script>
	</body>
	</html>`;
}

export function deactivate() {}