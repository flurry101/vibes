// src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';

let currentPanel: vscode.WebviewPanel | undefined;
let currentVibe: 'encouraging' | 'roasting' | 'neutral' = 'encouraging';
let currentState: 'idle' | 'productive' | 'stuck' | 'testing' | 'test_passed' | 'test_failed' = 'idle';

export function activate(context: vscode.ExtensionContext) {
	console.log('🎵 Vibe Driven Development is now active!');

	// Get configuration
	const config = vscode.workspace.getConfiguration('vibe-driven-development');
	const apiKey = config.get<string>('anthropicApiKey');

	// Warn if no API key
	if (!apiKey) {
		vscode.window.showWarningMessage(
			'VDD: Anthropic API key not set. Music generation will use fallback presets.',
			'Set API Key'
		).then(selection => {
			if (selection === 'Set API Key') {
				vscode.commands.executeCommand(
					'workbench.action.openSettings', 
					'vibe-driven-development.anthropicApiKey'
				);
			}
		});
	}

	// Register show companion command
	const showCompanion = vscode.commands.registerCommand(
		'vibe-driven-development.showCompanion', 
		() => {
			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.Two);
			} else {
				createWebviewPanel(context, apiKey || '');
			}
		}
	);

	context.subscriptions.push(showCompanion);

	// Auto-show on startup
	setTimeout(() => {
		vscode.commands.executeCommand('vibe-driven-development.showCompanion');
	}, 1000);

	// Activity detection
	setupActivityDetection(context);

	console.log('✅ VDD activated successfully');
}

function createWebviewPanel(context: vscode.ExtensionContext, apiKey: string) {
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

	currentPanel.webview.html = getWebviewContent(context, currentPanel.webview, apiKey);

	// Handle messages from webview
	currentPanel.webview.onDidReceiveMessage(
		message => {
			switch (message.command) {
				case 'vibeChanged':
					currentVibe = message.vibe;
					console.log(`🎭 Vibe changed to: ${currentVibe}`);
					// Regenerate music with new vibe
					sendStateUpdate(currentState);
					break;
				
				case 'musicInitialized':
					console.log('✅ Music generator initialized in webview');
					// Send initial state
					sendStateUpdate('idle');
					break;
				
				case 'musicPlaying':
					console.log(`🎵 Now playing: ${message.mood} (${message.state})`);
					break;
				
				case 'musicError':
					vscode.window.showErrorMessage(`VDD Music Error: ${message.error}`);
					console.error('Music error:', message.error);
					break;
				
				case 'log':
					console.log(`[Webview] ${message.message}`);
					break;
			}
		},
		undefined,
		context.subscriptions
	);

	currentPanel.onDidDispose(() => {
		currentPanel = undefined;
		currentState = 'idle';
	});
}

function setupActivityDetection(context: vscode.ExtensionContext) {
	let lastActivity = Date.now();
	let typingCount = 0;
	let wasProductive = false;

	// Detect typing
	const textDocumentListener = vscode.workspace.onDidChangeTextDocument(e => {
		lastActivity = Date.now();
		typingCount++;

		// After 20 keystrokes, consider them productive
		if (typingCount >= 20 && !wasProductive) {
			wasProductive = true;
			sendStateUpdate('productive');
			typingCount = 0;
		}
	});

	// Check for idle/stuck periodically
	const idleChecker = setInterval(() => {
		const idleTime = Date.now() - lastActivity;
		
		if (idleTime > 45000) {
			// Idle for 45+ seconds
			if (currentState !== 'idle') {
				wasProductive = false;
				sendStateUpdate('idle');
			}
		} else if (idleTime > 15000 && idleTime <= 45000) {
			// Idle for 15-45 seconds (might be stuck/thinking)
			if (currentState !== 'stuck' && wasProductive) {
				sendStateUpdate('stuck');
			}
		}
	}, 10000); // Check every 10 seconds

	context.subscriptions.push(
		textDocumentListener,
		{ dispose: () => clearInterval(idleChecker) }
	);
}

function sendStateUpdate(state: typeof currentState) {
	if (currentState === state) {
		return; // Don't send duplicate states
	}
	
	currentState = state;
	
	if (currentPanel) {
		currentPanel.webview.postMessage({
			command: 'stateChanged',
			state: state,
			vibe: currentVibe
		});
	}
}

function getWebviewContent(
	context: vscode.ExtensionContext, 
	webview: vscode.Webview, 
	apiKey: string
): string {
	const config = vscode.workspace.getConfiguration('vibe-driven-development');
	const musicEnabled = config.get<boolean>('musicEnabled', true);
	const musicVolume = config.get<number>('musicVolume', -10);

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
		.music-info {
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			margin-top: 5px;
			font-style: italic;
		}
		.controls {
			margin-top: 20px;
			display: flex;
			gap: 10px;
			justify-content: center;
		}
		.control-btn {
			padding: 8px 16px;
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 12px;
		}
		.control-btn:hover {
			background: var(--vscode-button-secondaryHoverBackground);
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
			Initializing music generator...
		</div>

		<div class="state" id="state">State: initializing</div>
		<div class="music-info" id="musicInfo"></div>

		<div class="controls">
			<button class="control-btn" id="toggleMusic">🔊 Mute Music</button>
		</div>
	</div>

	<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/15.1.22/Tone.js"></script>
	<script>
		const vscode = acquireVsCodeApi();
		const API_KEY = '${apiKey}';
		const MUSIC_ENABLED = ${musicEnabled};
		const BASE_VOLUME = ${musicVolume};
		
		let currentVibe = 'encouraging';
		let currentState = 'idle';
		let synth = null;
		let currentLoop = null;
		let musicMuted = false;

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

		// Initialize Tone.js
		async function initializeMusic() {
			try {
				await Tone.start();
				synth = new Tone.PolySynth(Tone.Synth).toDestination();
				synth.volume.value = BASE_VOLUME;
				
				vscode.postMessage({ 
					command: 'musicInitialized' 
				});
				
				updateDisplay();
			} catch (error) {
				console.error('Failed to initialize music:', error);
				vscode.postMessage({ 
					command: 'musicError', 
					error: error.message 
				});
			}
		}

		// Generate music parameters via AI
		async function generateMusicParams(state, vibe) {
			if (!API_KEY || API_KEY === '') {
				// Use fallback presets
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
  "volume": <-20 to 0>,
  "mood": "brief description"
}

State meanings:
- idle: Not coding
- productive: Actively coding
- stuck: Thinking/blocked
- testing: Running tests
- test_passed: Tests passed
- test_failed: Tests failed

Generate appropriate music for: \${state} + \${vibe}\`;

			try {
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
				const jsonMatch = data.content[0].text.match(/\\{[\\s\\S]*\\}/);
				
				if (jsonMatch) {
					return JSON.parse(jsonMatch[0]);
				}
				
				throw new Error('No valid JSON in response');
			} catch (error) {
				console.error('AI generation failed, using fallback:', error);
				return getFallbackParams(state, vibe);
			}
		}

		// Fallback presets
		function getFallbackParams(state, vibe) {
			const presets = {
				'productive-encouraging': {
					tempo: 120, notes: ['C4', 'E4', 'G4', 'C5'],
					duration: '4n', pattern: 'ascending', volume: -10, mood: 'upbeat'
				},
				'stuck-encouraging': {
					tempo: 80, notes: ['A3', 'C4', 'E4'],
					duration: '2n', pattern: 'chord', volume: -15, mood: 'contemplative'
				},
				'idle-neutral': {
					tempo: 70, notes: ['C3', 'G3'],
					duration: '1n', pattern: 'chord', volume: -20, mood: 'ambient'
				}
			};

			const key = \`\${state}-\${vibe}\`;
			return presets[key] || presets['idle-neutral'];
		}

		// Play music from parameters
		function playMusic(params) {
			if (!MUSIC_ENABLED || musicMuted || !synth) return;

			stopMusic();

			synth.volume.value = params.volume;
			Tone.Transport.bpm.value = params.tempo;

			const { notes, duration, pattern } = params;

			if (pattern === 'chord') {
				currentLoop = new Tone.Loop((time) => {
					synth.triggerAttackRelease(notes, duration, time);
				}, '2n');
				currentLoop.start(0);
			} else if (pattern === 'ascending' || pattern === 'descending') {
				const sequence = pattern === 'descending' ? [...notes].reverse() : notes;
				const seq = new Tone.Sequence((time, note) => {
					synth.triggerAttackRelease(note, duration, time);
				}, sequence, duration);
				seq.start(0);
			}

			Tone.Transport.start();

			document.getElementById('musicInfo').textContent = 
				\`♪ \${params.mood} • \${params.tempo}bpm • \${params.pattern}\`;

			vscode.postMessage({
				command: 'musicPlaying',
				mood: params.mood,
				state: currentState
			});
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

		// Update display
		function updateDisplay() {
			document.getElementById('companion').textContent = vibeEmojis[currentVibe];
			document.getElementById('message').textContent = messages[currentVibe][currentState];
			document.getElementById('state').textContent = 'State: ' + currentState;
		}

		// Vibe buttons
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

		// Toggle music
		document.getElementById('toggleMusic').addEventListener('click', () => {
			musicMuted = !musicMuted;
			document.getElementById('toggleMusic').textContent = 
				musicMuted ? '🔇 Unmute Music' : '🔊 Mute Music';
			
			if (musicMuted) {
				stopMusic();
			}
		});

		// Listen for state changes from extension
		window.addEventListener('message', async (event) => {
			const message = event.data;
			
			if (message.command === 'stateChanged') {
				currentState = message.state;
				currentVibe = message.vibe || currentVibe;
				
				updateDisplay();
				
				// Generate and play music
				const params = await generateMusicParams(currentState, currentVibe);
				playMusic(params);
			}
		});

		// Initialize on load
		initializeMusic();
	</script>
</body>
</html>`;
}

export function deactivate() {
	if (currentPanel) {
		currentPanel.dispose();
	}
}