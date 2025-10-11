import * as vscode from 'vscode';
import { ActivityDetector } from './detection/ActivityDetector';
import { TestRunnerIntegration } from './detection/TestRunner';
import { AIMusic Generator } from './ai/MusicGenerator';
import { StrudelGenerator } from './music/StrudelGenerator';
import { ActivityState, VibeMode, CompanionState } from './types';
import { getASCIIFrame, getASCIIFrameCount } from './utils/asciiArt';

let currentPanel: vscode.WebviewPanel | undefined;
let activityDetector: ActivityDetector | undefined;
let testRunner: TestRunnerIntegration | undefined;
let aiMusicGenerator: AIMusicGenerator | undefined;
let strudelGenerator: StrudelGenerator | undefined;

let currentVibe: VibeMode = 'encouraging';
let currentState: ActivityState = 'idle';
let animationFrame: number = 0;

export function activate(context: vscode.ExtensionContext) {
	console.log('🎵 Vibe Driven Development activated!');

	// Load settings
	const config = vscode.workspace.getConfiguration('vibe-driven-development');
	const apiKey = config.get<string>('geminiAPIkey') || '';
	currentVibe = config.get('defaultVibe') || 'encouraging';

	// Initialize generators
	aiMusicGenerator = new AIMusicGenerator(apiKey);
	strudelGenerator = new StrudelGenerator();

	// Setup activity detection (works even without webview)
	activityDetector = new ActivityDetector((state, metrics) => {
		currentState = state;
		console.log(`📊 State: ${state}`, metrics);
		
		// Update webview if open
		updateCompanion();
	});

	// Setup test runner integration
	testRunner = new TestRunnerIntegration(
		activityDetector,
		(passed, count) => {
			console.log(`🧪 Tests ${passed ? 'passed' : 'failed'}: ${count} tests`);
			updateCompanion();
		}
	);

	// Commands
	const showCommand = vscode.commands.registerCommand(
		'vibe-driven-development.showCompanion',
		() => showCompanion(context, apiKey)
	);

	const vibeCommand = vscode.commands.registerCommand(
		'vibe-driven-development.changeVibe',
		async () => {
			const vibe = await vscode.window.showQuickPick(
				['encouraging', 'roasting', 'neutral'],
				{ placeHolder: 'Choose your vibe...' }
			);
			if (vibe) {
				currentVibe = vibe as VibeMode;
				updateCompanion();
			}
		}
	);

	const toggleMusicCommand = vscode.commands.registerCommand(
		'vibe-driven-development.toggleMusic',
		() => {
			currentPanel?.webview.postMessage({ command: 'toggleMusic' });
		}
	);

	context.subscriptions.push(showCommand, vibeCommand, toggleMusicCommand);

	// Status bar item
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	statusBarItem.text = `$(rocket) ${currentVibe}`;
	statusBarItem.tooltip = 'Click to change vibe';
	statusBarItem.command = 'vibe-driven-development.changeVibe';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Update status bar with state
	setInterval(() => {
		const stateEmoji = {
			idle: '💤',
			productive: '🔥',
			stuck: '🤔',
			procrastinating: '😅',
			testing: '🧪',
			building: '⚙️',
			test_passed: '✅',
			test_failed: '❌'
		};
		statusBarItem.text = `${stateEmoji[currentState] || '$(rocket)'} ${currentVibe}`;
	}, 1000);

	// Auto-show on startup (optional)
	// showCompanion(context, apiKey);

	context.subscriptions.push({
		dispose: () => {
			activityDetector?.dispose();
		}
	});
}

function showCompanion(context: vscode.ExtensionContext, apiKey: string) {
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
			retainContextWhenHidden: true
		}
	);

	currentPanel.webview.html = getWebviewContent(apiKey);

	// Handle messages from webview
	currentPanel.webview.onDidReceiveMessage(async message => {
		switch (message.command) {
			case 'vibeChanged':
				currentVibe = message.vibe;
				updateCompanion();
				break;
			case 'requestMusicParams':
				if (aiMusicGenerator) {
					const params = await aiMusicGenerator.generateMusicParams(
						currentState,
						currentVibe
					);
					currentPanel?.webview.postMessage({
						command: 'musicParams',
						params: params
					});
				}
				break;
			case 'requestStrudelCode':
				if (strudelGenerator) {
					const code = strudelGenerator.generateStrudelCode(
						currentState,
						currentVibe
					);
					currentPanel?.webview.postMessage({
						command: 'strudelCode',
						code: code
					});
				}
				break;
		}
	});

	currentPanel.onDidDispose(() => {
		currentPanel = undefined;
	});

	// Start animation loop
	startAnimationLoop();
}

function startAnimationLoop() {
	setInterval(() => {
		if (!currentPanel) return;
		
		const frameCount = getASCIIFrameCount(currentVibe, currentState);
		animationFrame = (animationFrame + 1) % frameCount;
		
		updateCompanion();
	}, 500); // Update animation every 500ms
}

function updateCompanion() {
	if (!currentPanel || !activityDetector) {
		return;
	}

	const ascii = getASCIIFrame(currentVibe, currentState, animationFrame);
	const metrics = activityDetector.getMetricsSnapshot();

	const companionState: CompanionState = {
		vibe: currentVibe,
		activityState: currentState,
		message: `State: ${currentState}`,
		ascii: ascii,
		musicSource: { type: 'ai' }, // Will be populated by webview
		metrics: metrics
	};

	currentPanel.webview.postMessage({
		command: 'updateState',
		state: companionState
	});
}

function getWebviewContent(apiKey: string): string {
	// [NEXT PART - Webview HTML with Strudel integration]
	return `<!DOCTYPE html>
	<html>
	<head>
		<meta charset="UTF-8">
		<style>
			* { margin: 0; padding: 0; box-sizing: border-box; }
			body {
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background: var(--vscode-editor-background);
				padding: 20px;
			}
			.container { max-width: 600px; margin: 0 auto; }
			
			.vibe-selector {
				display: flex;
				gap: 10px;
				margin: 20px 0;
				justify-content: center;
			}
			
			.btn {
				padding: 10px 20px;
				border: 2px solid var(--vscode-button-border);
				background: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				cursor: pointer;
				border-radius: 6px;
			}
			
			.btn.active {
				background: var(--vscode-button-secondaryBackground);
				border-color: var(--vscode-focusBorder);
			}
			
			.ascii-art {
				font-family: 'Courier New', monospace;
				white-space: pre;
				text-align: center;
				font-size: 16px;
				line-height: 1.3;
				margin: 30px 0;
				background: var(--vscode-textCodeBlock-background);
				padding: 20px;
				border-radius: 8px;
				min-height: 180px;
			}
			
			.music-controls {
				display: flex;
				gap: 10px;
				justify-content: center;
				margin: 20px 0;
				flex-wrap: wrap;
			}
			
			.metrics {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
				gap: 10px;
				margin: 20px 0;
			}
			
			.metric {
				padding: 10px;
				background: var(--vscode-editor-inactiveSelectionBackground);
				border-radius: 4px;
				font-size: 12px;
			}
			
			.metric-label {
				color: var(--vscode-descriptionForeground);
			}
			
			.metric-value {
				font-size: 16px;
				font-weight: bold;
				margin-top: 5px;
			}
		</style>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
	</head>
	<body>
		<div class="container">
			<h1 style="text-align: center;">🎵 Vibe Companion</h1>
			
			<div class="vibe-selector">
				<button class="btn active" data-vibe="encouraging">😊 Encouraging</button>
				<button class="btn" data-vibe="roasting">😏 Roasting</button>
				<button class="btn" data-vibe="neutral">🤖 Neutral</button>
			</div>

			<div class="ascii-art" id="asciiArt">Loading...</div>

			<div class="music-controls">
				<button class="btn" id="musicToggle">🔊 Music ON</button>
				<select class="btn" id="musicMode">
					<option value="curated">Curated</option>
					<option value="ai">AI Generated</option>
					<option value="strudel">Strudel Live</option>
					<option value="hybrid" selected>Hybrid</option>
				</select>
			</div>

			<div class="metrics">
				<div class="metric">
					<div class="metric-label">Typing Speed</div>
					<div class="metric-value" id="typingSpeed">0 CPM</div>
				</div>
				<div class="metric">
					<div class="metric-label">Idle Time</div>
					<div class="metric-value" id="idleTime">0s</div>
				</div>
				<div class="metric">
					<div class="metric-label">Tab Switches</div>
					<div class="metric-value" id="tabSwitches">0</div>
				</div>
				<div class="metric">
					<div class="metric-label">Time in File</div>
					<div class="metric-value" id="timeInFile">0m</div>
				</div>
			</div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();
			let currentVibe = 'encouraging';
			let musicMode = 'hybrid';
			let musicEnabled = true;
			let musicInitialized = false;
			let synth = null;

			// Initialize Tone.js
			async function initMusic() {
				if (musicInitialized) return;
				await Tone.start();
				synth = new Tone.PolySynth(Tone.Synth).toDestination();
				synth.volume.value = -10;
				musicInitialized = true;
				console.log('🎵 Music ready');
			}

			// Vibe buttons
			document.querySelectorAll('.btn[data-vibe]').forEach(btn => {
				btn.addEventListener('click', async () => {
					if (!musicInitialized) await initMusic();
					
					document.querySelectorAll('.btn[data-vibe]').forEach(b => 
						b.classList.remove('active')
					);
					btn.classList.add('active');
					
					currentVibe = btn.dataset.vibe;
					vscode.postMessage({ command: 'vibeChanged', vibe: currentVibe });
				});
			});

			// Music toggle
			document.getElementById('musicToggle').addEventListener('click', async () => {
				if (!musicInitialized) await initMusic();
				musicEnabled = !musicEnabled;
				document.getElementById('musicToggle').textContent = 
					musicEnabled ? '🔊 Music ON' : '🔇 Music OFF';
				
				if (!musicEnabled) {
					Tone.Transport.stop();
				}
			});

			// Music mode
			document.getElementById('musicMode').addEventListener('change', (e) => {
				musicMode = e.target.value;
				console.log('Music mode:', musicMode);
			});

			// Listen for updates
			window.addEventListener('message', async event => {
				const message = event.data;
				
				if (message.command === 'updateState') {
					const state = message.state;
					
					// Update ASCII
					document.getElementById('asciiArt').textContent = state.ascii;
					
					// Update metrics
					document.getElementById('typingSpeed').textContent = 
						Math.round(state.metrics.typingSpeed) + ' CPM';
					document.getElementById('idleTime').textContent = 
						Math.round(state.metrics.idleTime / 1000) + 's';
					document.getElementById('tabSwitches').textContent = 
						state.metrics.tabSwitches;
					document.getElementById('timeInFile').textContent = 
						Math.round(state.metrics.timeInFile / 60000) + 'm';
					
					// Request music if enabled
					if (musicEnabled && musicInitialized) {
						if (musicMode === 'ai' || musicMode === 'hybrid') {
							vscode.postMessage({ command: 'requestMusicParams' });
						} else if (musicMode === 'strudel') {
							vscode.postMessage({ command: 'requestStrudelCode' });
						}
					}
				} else if (message.command === 'musicParams') {
					playAIMusic(message.params);
				} else if (message.command === 'strudelCode') {
					console.log('Strudel code:', message.code);
					// TODO: Integrate Strudel player
				}
			});

			// Play AI-generated music
			function playAIMusic(params) {
				if (!synth) return;
				
				Tone.Transport.stop();
				Tone.Transport.cancel(0);
				
				synth.volume.value = params.volume;
				Tone.Transport.bpm.value = params.tempo;

				const { notes, duration, pattern } = params;

				if (pattern === 'chord') {
					const loop = new Tone.Loop((time) => {
						synth.triggerAttackRelease(notes, duration, time);
					}, '1n');
					loop.start(0);
				} else if (pattern === 'ascending' || pattern === 'descending') {
					const seq = pattern === 'descending' ? [...notes].reverse() : notes;
					const sequence = new Tone.Sequence((time, note) => {
						synth.triggerAttackRelease(note, duration, time);
					}, seq, duration);
					sequence.start(0);
				}

				Tone.Transport.start();
			}

			console.log('🚀 Vibe Companion ready!');
		</script>
	</body>
	</html>`;
}

export function deactivate() {
	activityDetector?.dispose();
}