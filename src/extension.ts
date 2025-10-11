import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/ActivityDetector';
import { MusicEngine } from './music/musicEngine';
import { DialogueManager, DialogueContext } from './music/dialogueManager';
import { TestRunner } from './detection/TestRunner';
import { MusicData, ActivityState, VibeMode, MusicMode } from './types';
import { STATE_PLAYLISTS } from './music/curated';

let activityDetector: ActivityDetector | undefined;
let musicEngine: MusicEngine | undefined;
let dialogueManager: DialogueManager | undefined;
let testRunner: TestRunner | undefined;
let currentPanel: vscode.WebviewPanel | undefined;
let sessionStartTime: number = Date.now();
let statusBarItem: vscode.StatusBarItem | undefined;
let avatarVisible: boolean = true;
let avatarMinimized: boolean = false;
let musicMode: MusicMode = 'automatic';

export function activate(context: vscode.ExtensionContext) {
	console.log('Vibe-Driven Development extension activated! 🎵');

	// Create status bar item with avatar indicator
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '👩‍💻';
	statusBarItem.tooltip = 'Vibe Companion - Click to toggle UI';
	statusBarItem.command = 'vibe-driven-development.toggleUI';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Register commands
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
					vscode.Uri.file(path.join(context.extensionPath, 'dist')),
					vscode.Uri.file(path.join(context.extensionPath, 'assets'))
				]
			}
		);

		// Prepare image URIs
		const imageUris = {
			idle: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'lofi-girl-sleeping-wallpaper-1920x1200_6.jpg'))),
			productive: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'images.jpg'))),
			stuck: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'images (1).jpg'))),
			procrastinating: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', '1af93018ad8cf86bd2f441ff67057858.jpg'))),
			testing: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'maxresdefault.jpg'))),
			building: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'maxresdefault.jpg'))),
			test_passed: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'maxresdefault.jpg'))),
			test_failed: currentPanel.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'assets', 'maxresdefault.jpg')))
		};

		currentPanel.webview.html = getWebviewContent(context, currentPanel.webview, imageUris);

		// Send initial state
		currentPanel.webview.postMessage({
			command: 'init',
			musicMode: musicMode
		});

		// Initialize components
		musicEngine = new MusicEngine((data: MusicData) => {
			currentPanel?.webview.postMessage(data);
		});

		dialogueManager = new DialogueManager(true, 'rare');

		activityDetector = new ActivityDetector((newState) => {
			console.log('📡 Activity state changed:', newState);

			// Update status bar based on state
			updateStatusBar(newState);

			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: newState
			});

			currentPanel?.webview.postMessage({
				command: 'updateAvatarState',
				state: newState
			});

			if (musicMode === 'automatic') {
				musicEngine?.playStateMusic(newState);
			} else {
				// Playlist mode - send playlist data
				const playlist = STATE_PLAYLISTS[newState] || [];
				currentPanel?.webview.postMessage({
					command: 'playPlaylist',
					playlist: playlist
				});
			}
			handleDialogue(newState);
		});

		if (activityDetector) {
			testRunner = new TestRunner(activityDetector);
		}

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
					case 'toggleDialogue':
						if (dialogueManager) {
							dialogueManager.setEnabled(message.enabled);
						}
						break;
					case 'setDialogueFrequency':
						if (dialogueManager) {
							dialogueManager.setFrequency(message.frequency);
						}
						break;
					case 'playPlaylist':
						// Open first playlist item in browser
						if (message.playlist && message.playlist.length > 0) {
							const firstItem = message.playlist[0];
							vscode.env.openExternal(vscode.Uri.parse(firstItem.url));
						}
						break;
					case 'toggleMusicMode':
						// This is sent from webview, handle in extension
						break;
					case 'changeBeats':
						currentPanel?.webview.postMessage({
							command: 'changeBeats'
						});
						break;
					case 'changeRhythm':
						currentPanel?.webview.postMessage({
							command: 'changeRhythm'
						});
						break;
					case 'changeSpeed':
						currentPanel?.webview.postMessage({
							command: 'changeSpeed'
						});
						break;
					case 'startMusic':
						// Start music manually
						const currentState = activityDetector?.getCurrentState() || 'idle';
						musicEngine?.playStateMusic(currentState);
						break;
					case 'toggleUI':
						// Toggle UI compact mode
						currentPanel?.webview.postMessage({
							command: 'toggleUI'
						});
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
			// Keep components running for background functionality
			// Only dispose when extension deactivates
		});
	});

	// Keyboard shortcuts
	let toggleUI = vscode.commands.registerCommand('vibe-driven-development.toggleUI', () => {
		currentPanel?.webview.postMessage({
			command: 'toggleUI'
		});
	});

	let minimizeAvatar = vscode.commands.registerCommand('vibe-driven-development.minimizeAvatar', () => {
		avatarMinimized = !avatarMinimized;
		currentPanel?.webview.postMessage({
			command: 'minimizeAvatar',
			minimized: avatarMinimized
		});
	});

	let switchAnimationMode = vscode.commands.registerCommand('vibe-driven-development.switchAnimationMode', async () => {
		const states = ['idle', 'productive', 'stuck', 'testing', 'test_passed', 'test_failed', 'building'];
		const selected = await vscode.window.showQuickPick(states, {
			placeHolder: 'Select animation state'
		});
		if (selected) {
			currentPanel?.webview.postMessage({
				command: 'updateAvatarState',
				state: selected
			});
		}
	});

	let pauseAnimations = vscode.commands.registerCommand('vibe-driven-development.pauseAnimations', () => {
		currentPanel?.webview.postMessage({
			command: 'pauseAnimations'
		});
	});

	let customizeAvatar = vscode.commands.registerCommand('vibe-driven-development.customizeAvatar', async () => {
		const themes = ['cyberpunk', 'cozy', 'minimal', 'neon'];
		const selected = await vscode.window.showQuickPick(themes, {
			placeHolder: 'Select avatar theme'
		});
		if (selected) {
			currentPanel?.webview.postMessage({
				command: 'changeTheme',
				theme: selected
			});
		}
	});

	let resetPosition = vscode.commands.registerCommand('vibe-driven-development.resetPosition', () => {
		currentPanel?.webview.postMessage({
			command: 'resetPosition'
		});
	});

	let toggleMusicMode = vscode.commands.registerCommand('vibe-driven-development.toggleMusicMode', () => {
		musicMode = musicMode === 'automatic' ? 'playlist' : 'automatic';
		vscode.window.showInformationMessage(`Music mode switched to: ${musicMode}`);
		// Optionally trigger current state music
		const currentState = activityDetector?.getCurrentState();
		if (currentState) {
			if (musicMode === 'automatic') {
				musicEngine?.playStateMusic(currentState);
			} else {
				const playlist = STATE_PLAYLISTS[currentState] || [];
				currentPanel?.webview.postMessage({
					command: 'playPlaylist',
					playlist: playlist
				});
			}
		}
	});

	// Register all commands
	context.subscriptions.push(
		showCompanion,
		toggleUI,
		minimizeAvatar,
		switchAnimationMode,
		pauseAnimations,
		customizeAvatar,
		resetPosition,
		toggleMusicMode
	);

	// Auto-show on startup
	vscode.commands.executeCommand('vibe-driven-development.showCompanion');
}

export function deactivate() {
	activityDetector?.dispose();
	musicEngine?.dispose();
	testRunner?.dispose();
	currentPanel?.dispose();
}

function updateStatusBar(state: ActivityState) {
	if (!statusBarItem) {return;};
	
	const stateEmojis: Record<ActivityState, string> = {
		idle: '💤',
		productive: '⚡',
		stuck: '🤔',
		procrastinating: '😴',
		testing: '🧪',
		building: '🔨',
		test_passed: '✅',
		test_failed: '❌'
	};
	
	statusBarItem.text = `👩‍💻 ${stateEmojis[state] || '💻'}`;
	statusBarItem.tooltip = `Vibe Companion - ${state}`;
}

async function handleDialogue(state: ActivityState) {
	if (!dialogueManager) {return;};

	const sessionDuration = Date.now() - sessionStartTime;
	let context: DialogueContext | null = null;

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

function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview, imageUris: Record<string, vscode.Uri>): string {
	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>
		<title>Vibe Companion</title>
		<style>
			* { margin: 0; padding: 0; box-sizing: border-box; }
			
			:root {
				--pixel-size: 4px;
				--avatar-size: 32;
				--glow-color: #00ffcc;
				--hoodie-color: #6b46c1;
				--hoodie-dark: #553c9a;
				--skin-color: #fdbcb4;
				--hair-color: #2c1810;
				--glasses-color: #1a1a1a;
				--headphones-color: #1f2937;
				--headphones-accent: #dc2626;
			}
			
			body {
				font-family: var(--vscode-font-family);
				color: var(--vscode-foreground);
				background: var(--vscode-editor-background);
				padding: 20px;
				overflow-y: auto;
				position: relative;
			}
			
			.container {
				max-width: 500px;
				margin: 0 auto;
				text-align: center;
				position: relative;
				transition: all 0.3s ease;
			}

			.container.compact {
				max-width: 220px;
			}

			.container.compact .vibe-selector,
			.container.compact .message,
			.container.compact .state,
			.container.compact .controls,
			.container.compact .keyboard-shortcuts {
				display: none;
			}

			.container.compact h1 {
				display: none;
			}
			
			h1 { 
				margin-bottom: 20px; 
				font-size: 24px; 
			}
			
			/* IMAGE AVATAR CONTAINER */
			.avatar-wrapper {
				position: relative;
				display: inline-block;
				margin: 20px auto;
				transition: all 0.3s ease;
				cursor: pointer;
			}

			.avatar-wrapper.minimized {
				transform: scale(0.5);
				position: fixed;
				bottom: 20px;
				right: 20px;
				z-index: 1000;
			}

			.avatar-wrapper.hidden {
				display: none;
			}

			.image-avatar-container {
				position: relative;
				width: 200px;
				height: 200px;
				filter: drop-shadow(0 0 10px var(--glow-color));
				transition: filter 0.3s ease;
				border-radius: 10px;
				overflow: hidden;
			}

			.avatar-image {
				width: 100%;
				height: 100%;
				object-fit: cover;
				border-radius: 10px;
			}
			
			/* Animation states */
			@keyframes idle-breathing {
				0%, 100% { transform: translateY(0) scale(1); }
				50% { transform: translateY(-2px) scale(1.01); }
			}
			
			@keyframes typing {
				0%, 100% { transform: translateX(0); }
				25% { transform: translateX(-1px); }
				75% { transform: translateX(1px); }
			}
			
			@keyframes stuck-thinking {
				0%, 100% { transform: rotate(0deg); }
				25% { transform: rotate(-2deg); }
				75% { transform: rotate(2deg); }
			}
			
			@keyframes error-shake {
				0%, 100% { transform: translateX(0); }
				10% { transform: translateX(-2px) rotate(-1deg); }
				20% { transform: translateX(2px) rotate(1deg); }
				30% { transform: translateX(-2px) rotate(-1deg); }
				40% { transform: translateX(2px) rotate(1deg); }
				50% { transform: translateX(0) rotate(0deg); }
			}
			
			@keyframes success-bounce {
				0%, 100% { transform: translateY(0) scale(1); }
				30% { transform: translateY(-5px) scale(1.05); }
				60% { transform: translateY(2px) scale(0.98); }
			}
			
			@keyframes building-pulse {
				0%, 100% { 
					filter: drop-shadow(0 0 10px var(--glow-color));
				}
				50% { 
					filter: drop-shadow(0 0 20px var(--glow-color)) brightness(1.1);
				}
			}
			
			@keyframes blink {
				0%, 90%, 100% { opacity: 1; }
				95% { opacity: 0; }
			}
			
			/* State classes */
			.avatar-state-idle {
				animation: idle-breathing 4s ease-in-out infinite;
			}
			
			.avatar-state-idle .pixel-avatar-container {
				filter: drop-shadow(0 0 5px rgba(0, 255, 204, 0.3));
			}
			
			.avatar-state-productive {
				animation: typing 0.3s ease-in-out infinite;
			}
			
			.avatar-state-productive .pixel-avatar-container {
				filter: drop-shadow(0 0 15px rgba(255, 200, 0, 0.6));
			}
			
			.avatar-state-stuck {
				animation: stuck-thinking 3s ease-in-out infinite;
			}
			
			.avatar-state-stuck .pixel-avatar-container {
				filter: drop-shadow(0 0 10px rgba(255, 100, 100, 0.4));
			}
			
			.avatar-state-test_failed {
				animation: error-shake 0.5s ease-in-out;
			}
			
			.avatar-state-test_failed .pixel-avatar-container {
				filter: drop-shadow(0 0 15px rgba(255, 0, 0, 0.5));
			}
			
			.avatar-state-test_passed {
				animation: success-bounce 1s ease-in-out;
			}
			
			.avatar-state-test_passed .pixel-avatar-container {
				filter: drop-shadow(0 0 20px rgba(0, 255, 0, 0.6));
			}
			
			.avatar-state-building {
				animation: building-pulse 2s ease-in-out infinite;
			}
			
			.avatar-state-testing .pixel-avatar-container {
				filter: drop-shadow(0 0 12px rgba(255, 255, 0, 0.5));
			}
			
			/* Blinking eyes animation */
			.eyes-container {
				animation: blink 5s infinite;
			}
			
			/* Thought bubble */
			.thought-bubble {
				position: absolute;
				top: -40px;
				right: -20px;
				background: var(--vscode-editor-background);
				border: 2px solid var(--vscode-foreground);
				border-radius: 50%;
				padding: 5px 10px;
				font-size: 16px;
				opacity: 0;
				transition: opacity 0.3s ease;
			}
			
			.thought-bubble.show {
				opacity: 1;
			}
			
			.thought-bubble::before,
			.thought-bubble::after {
				content: '';
				position: absolute;
				background: var(--vscode-editor-background);
				border: 2px solid var(--vscode-foreground);
				border-radius: 50%;
			}
			
			.thought-bubble::before {
				width: 10px;
				height: 10px;
				bottom: -10px;
				right: 15px;
			}
			
			.thought-bubble::after {
				width: 6px;
				height: 6px;
				bottom: -15px;
				right: 10px;
			}
			
			/* Code particles floating around */
			.code-particles {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				pointer-events: none;
				overflow: hidden;
			}
			
			.code-particle {
				position: absolute;
				color: var(--glow-color);
				opacity: 0.3;
				font-family: 'Courier New', monospace;
				font-size: 10px;
				animation: float-around 10s linear infinite;
				text-shadow: 0 0 5px currentColor;
			}
			
			@keyframes float-around {
				0% {
					transform: translate(0, 100vh) rotate(0deg);
					opacity: 0;
				}
				10% {
					opacity: 0.3;
				}
				90% {
					opacity: 0.3;
				}
				100% {
					transform: translate(100px, -100vh) rotate(360deg);
					opacity: 0;
				}
			}
			
			/* Theme variations */
			.theme-cyberpunk {
				--glow-color: #00ffcc;
				--hoodie-color: #1a0033;
				--headphones-accent: #ff00ff;
			}
			
			.theme-cozy {
				--glow-color: #ffcc99;
				--hoodie-color: #8b6f47;
				--headphones-accent: #ff9966;
			}
			
			.theme-minimal {
				--glow-color: #cccccc;
				--hoodie-color: #333333;
				--headphones-accent: #666666;
			}
			
			.theme-neon {
				--glow-color: #ff00ff;
				--hoodie-color: #000033;
				--headphones-accent: #00ffff;
			}
			
			/* Controls */
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
				flex: 1;
			}
			
			.control-btn:hover {
				background: var(--vscode-button-hoverBackground);
			}
			
			.keyboard-shortcuts {
				margin-top: 20px;
				padding: 15px;
				background: var(--vscode-editor-inactiveSelectionBackground);
				border-radius: 8px;
				font-size: 11px;
				text-align: left;
			}
			
			.shortcut-row {
				display: flex;
				justify-content: space-between;
				margin: 5px 0;
			}
			
			.shortcut-key {
				font-family: monospace;
				background: var(--vscode-button-background);
				padding: 2px 6px;
				border-radius: 3px;
				font-size: 10px;
			}
			
			/* Avatar dragging */
			.avatar-wrapper.draggable {
				cursor: move;
			}
			
			.avatar-wrapper.dragging {
				opacity: 0.7;
				z-index: 1001;
			}
			
			.paused {
				animation-play-state: paused !important;
			}
		</style>
	</head>
	<body>
		<div class="container" id="mainContainer">
			<h1>🎵 Vibe Companion</h1>

			<div class="vibe-selector">
				<button class="vibe-btn active" data-vibe="encouraging">😊 Encouraging</button>
				<button class="vibe-btn" data-vibe="roasting">😏 Roasting</button>
				<button class="vibe-btn" data-vibe="neutral">🤖 Neutral</button>
			</div>

			<!-- IMAGE AVATAR -->
			<div class="avatar-wrapper" id="avatarWrapper">
				<div class="avatar-state-idle" id="avatarState">
					<div class="image-avatar-container">
						<img id="avatarImage" class="avatar-image" src="" alt="Coding Avatar">
						<div class="thought-bubble" id="thoughtBubble"></div>
					</div>
					<div class="code-particles" id="codeParticles"></div>
				</div>
			</div>

			<div class="message" id="message">
				Ready to vibe! Start coding...
			</div>

			<div class="state" id="state">
				State: idle
			</div>

			<div class="controls">
				<div class="control-row">
					<button class="control-btn" id="startMusicBtn">🎵 Start Music</button>
					<button class="control-btn" id="musicModeBtn">🎵 Auto</button>
				</div>
				<div class="control-row">
					<button class="control-btn" id="pauseBtn">⏸️ Pause</button>
					<button class="control-btn" id="themeBtn">🎨 Theme</button>
				</div>
				<div class="control-row">
					<button class="control-btn" id="changeBeatsBtn">🥁 Beats</button>
					<button class="control-btn" id="changeRhythmBtn">🎼 Rhythm</button>
					<button class="control-btn" id="changeSpeedBtn">⚡ Speed</button>
				</div>
			</div>

			<div class="keyboard-shortcuts">
				<div style="font-weight: bold; margin-bottom: 10px;">⌨️ Keyboard Shortcuts</div>
				<div class="shortcut-row">
					<span><span class="shortcut-key">Ctrl+Alt+U</span></span>
					<span>Toggle UI mode</span>
				</div>
				<div class="shortcut-row">
					<span><span class="shortcut-key">Ctrl+Alt+T</span></span>
					<span>Toggle music mode</span>
				</div>
				<div class="shortcut-row">
					<span><span class="shortcut-key">Ctrl+Alt+S</span></span>
					<span>Switch state</span>
				</div>
				<div class="shortcut-row">
					<span><span class="shortcut-key">Ctrl+Alt+P</span></span>
					<span>Pause animations</span>
				</div>
				<div class="shortcut-row">
					<span><span class="shortcut-key">Ctrl+Alt+C</span></span>
					<span>Customize theme</span>
				</div>
				<div class="shortcut-row">
					<span><span class="shortcut-key">Ctrl+Alt+R</span></span>
					<span>Reset position</span>
				</div>
			</div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();

			let currentVibe = 'encouraging';
			let currentState = 'idle';
			let isPaused = false;
			let currentTheme = 'cyberpunk';
			let blinkInterval = null;
			let thoughtBubbleTimeout = null;
			let isCompact = false;
			let musicMode = 'automatic';

			const imageUris = ${JSON.stringify(Object.fromEntries(Object.entries(imageUris).map(([k, v]) => [k, v.toString()])))};
			

			// Generate floating code particles
			function generateCodeParticles() {
				const particlesContainer = document.getElementById('codeParticles');
				particlesContainer.innerHTML = '';

				const codeSnippets = ['{', '}', '()', '=>', 'const', 'let', 'function', 'class', 'import', 'export'];

				for (let i = 0; i < 15; i++) {
					const particle = document.createElement('div');
					particle.className = 'code-particle';
					particle.textContent = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
					particle.style.left = Math.random() * 100 + '%';
					particle.style.top = Math.random() * 100 + '%';
					particle.style.animationDelay = Math.random() * 10 + 's';
					particlesContainer.appendChild(particle);
				}
			}

			// Update avatar state
			function updateAvatarState(state) {
				currentState = state;
				document.getElementById('state').textContent = 'State: ' + state;
				document.getElementById('avatarState').className = 'avatar-state-' + state;

				// Update avatar image based on state
				const avatarImg = document.getElementById('avatarImage');
				if (avatarImg) {
					const imageSrc = imageUris[state] || imageUris['idle'] || '';
					if (imageSrc) {
						avatarImg.src = imageSrc;
						avatarImg.style.display = 'block'; // Ensure it's visible
						avatarImg.onerror = () => {
							console.log('Image failed to load:', imageSrc);
							avatarImg.style.display = 'none';
						};
					} else {
						avatarImg.style.display = 'none';
					}
				}

				// Show thought bubble for stuck state
				if (state === 'stuck') {
					showThoughtBubble('🤔');
				} else if (state === 'test_failed') {
					showThoughtBubble('😵');
				} else {
					hideThoughtBubble();
				}
			}

			// Toggle compact mode
			function toggleCompact() {
				isCompact = !isCompact;
				const container = document.getElementById('mainContainer');
				if (isCompact) {
					container.classList.add('compact');
				} else {
					container.classList.remove('compact');
				}
			}

			// Toggle music mode
			function toggleMusicMode() {
				musicMode = musicMode === 'automatic' ? 'playlist' : 'automatic';
				const btn = document.getElementById('musicModeBtn');
				btn.textContent = musicMode === 'automatic' ? '🎵 Auto' : '🎶 Playlist';
				vscode.postMessage({ command: 'toggleMusicMode' });
			}

			// Show thought bubble
			function showThoughtBubble(emoji) {
				const bubble = document.getElementById('thoughtBubble');
				bubble.textContent = emoji;
				bubble.classList.add('show');
				if (thoughtBubbleTimeout) clearTimeout(thoughtBubbleTimeout);
				thoughtBubbleTimeout = setTimeout(() => {
					hideThoughtBubble();
				}, 3000);
			}

			// Hide thought bubble
			function hideThoughtBubble() {
				document.getElementById('thoughtBubble').classList.remove('show');
			}

			// Music generation
			let currentMusic = null;
			let strudelPattern = null;

			function playMusic(state, vibe) {
				stopMusic();

				// Simple Tone.js music generation based on state
				const synth = new Tone.Synth().toDestination();
				const notes = {
					idle: ['C4', 'E4', 'G4'],
					productive: ['D4', 'F#4', 'A4'],
					stuck: ['A3', 'C4', 'E4'],
					procrastinating: ['B3', 'D4', 'F#4'],
					testing: ['E4', 'G4', 'B4'],
					building: ['F4', 'A4', 'C5'],
					test_passed: ['G4', 'B4', 'D5'],
					test_failed: ['A3', 'C4', 'D#4']
				};

				const sequence = new Tone.Sequence((time, note) => {
					synth.triggerAttackRelease(note, '8n', time);
				}, notes[state] || notes.idle, '4n');

				sequence.loop = true;
				sequence.start();
				currentMusic = sequence;

				Tone.Transport.start();
			}

			function stopMusic() {
				if (currentMusic) {
					currentMusic.stop();
					currentMusic.dispose();
					currentMusic = null;
				}
				if (strudelPattern) {
					strudelPattern.stop();
					strudelPattern = null;
				}
			}

			function changeBeats() {
				// Implement beat changes
				vscode.postMessage({ command: 'showQuote', quote: 'Beats changed!' });
			}

			function changeRhythm() {
				// Implement rhythm changes
				vscode.postMessage({ command: 'showQuote', quote: 'Rhythm changed!' });
			}

			function changeSpeed() {
				// Implement speed changes
				if (Tone.Transport.bpm) {
					Tone.Transport.bpm.value = (Tone.Transport.bpm.value + 20) % 200 || 120;
				}
				vscode.postMessage({ command: 'showQuote', quote: 'Speed changed!' });
			}

			function updatePersonalityMessage(vibe) {
				const messages = {
					encouraging: 'Ready to vibe! Start coding...',
					roasting: 'What are you waiting for? Code already!',
					neutral: 'Systems online. Awaiting input.'
				};
				document.getElementById('message').textContent = messages[vibe] || messages.encouraging;
			}

			// Initialize
			document.addEventListener('DOMContentLoaded', async () => {
				// Start Tone.js
				await Tone.start();

				updateAvatarState('idle');
				updatePersonalityMessage('encouraging');
				generateCodeParticles();

				// Avatar click to toggle compact mode
				document.getElementById('avatarWrapper').addEventListener('click', (e) => {
					if (!e.target.closest('.thought-bubble')) {
						toggleCompact();
					}
				});

				// Vibe selector
				document.querySelectorAll('.vibe-btn').forEach(btn => {
					btn.addEventListener('click', () => {
						document.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('active'));
						btn.classList.add('active');
						currentVibe = btn.dataset.vibe;
						updatePersonalityMessage(currentVibe);
						vscode.postMessage({ command: 'vibeChanged', vibe: currentVibe });
					});
				});

				// Control buttons
				document.getElementById('startMusicBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					vscode.postMessage({ command: 'startMusic' });
				});

				document.getElementById('musicModeBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					toggleMusicMode();
				});

				document.getElementById('pauseBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					isPaused = !isPaused;
					document.getElementById('pauseBtn').textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
					vscode.postMessage({ command: 'pauseAnimations' });
				});

				document.getElementById('themeBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					vscode.postMessage({ command: 'customizeAvatar' });
				});

				// Strudel controls
				document.getElementById('changeBeatsBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					vscode.postMessage({ command: 'changeBeats' });
				});

				document.getElementById('changeRhythmBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					vscode.postMessage({ command: 'changeRhythm' });
				});

				document.getElementById('changeSpeedBtn').addEventListener('click', (e) => {
					e.stopPropagation();
					vscode.postMessage({ command: 'changeSpeed' });
				});
			});

			// Handle messages from extension
			window.addEventListener('message', event => {
				const message = event.data;

				switch (message.command) {
					case 'init':
						musicMode = message.musicMode;
						document.getElementById('musicModeBtn').textContent = musicMode === 'automatic' ? '🎵 Auto' : '🎶 Playlist';
						break;
					case 'stateChanged':
						updateAvatarState(message.state);
						break;
					case 'updateAvatarState':
						updateAvatarState(message.state);
						break;
					case 'playMusic':
						playMusic(message.state, message.vibe);
						break;
					case 'stopMusic':
						stopMusic();
						break;
					case 'toggleAvatar':
						const wrapper = document.getElementById('avatarWrapper');
						if (message.visible) {
							wrapper.classList.remove('hidden');
						} else {
							wrapper.classList.add('hidden');
						}
						break;
					case 'minimizeAvatar':
						const avatarWrapper = document.getElementById('avatarWrapper');
						if (message.minimized) {
							avatarWrapper.classList.add('minimized');
						} else {
							avatarWrapper.classList.remove('minimized');
						}
						break;
					case 'pauseAnimations':
						document.body.classList.toggle('paused');
						break;
					case 'changeTheme':
						document.body.classList.remove('theme-' + currentTheme);
						currentTheme = message.theme;
						document.body.classList.add('theme-' + currentTheme);
						break;
					case 'resetPosition':
						const avatarW = document.getElementById('avatarWrapper');
						avatarW.classList.remove('minimized');
						break;
					case 'showQuote':
						document.getElementById('message').textContent = message.quote;
						break;
					case 'hint':
						document.getElementById('message').textContent = message.text;
						break;
					case 'metrics':
						document.getElementById('message').textContent = 'Metrics: ' + JSON.stringify(message.data);
						break;
					case 'changeBeats':
						changeBeats();
						break;
					case 'changeRhythm':
						changeRhythm();
						break;
					case 'changeSpeed':
						changeSpeed();
						break;
					case 'toggleUI':
						toggleCompact();
						break;
				}
			});
		</script>
	</body>
</html>`;
}