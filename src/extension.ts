import * as vscode from 'vscode';
import * as path from 'path';
import { ActivityDetector } from './detection/ActivityDetector';
import { MusicEngine } from './music/musicEngine';
import { DialogueManager, DialogueContext } from './music/dialogueManager';
import { TestRunner } from './detection/TestRunner';
import { StrudelGenerator } from './music/StrudelGenerator';
import { MusicData, ActivityState, VibeMode, MusicMode } from './types';
import { STATE_PLAYLISTS } from './music/curated';

let activityDetector: ActivityDetector | undefined;
let musicEngine: MusicEngine | undefined;
let dialogueManager: DialogueManager | undefined;
let testRunner: TestRunner | undefined;
let strudelGenerator: StrudelGenerator | undefined;
let currentPanel: vscode.WebviewPanel | undefined;
let sessionStartTime: number = Date.now();
let statusBarItem: vscode.StatusBarItem | undefined;
let avatarVisible: boolean = true;
let avatarMinimized: boolean = false;
let musicMode: MusicMode = 'automatic';
let isPaused: boolean = false;
let musicStarted: boolean = false;
let currentStateStartTime: number = Date.now();
let durationInterval: NodeJS.Timeout | undefined;
let lastActivityTime: number = Date.now();
let currentTheme: string = 'cyberpunk';
let audioContext: any = undefined;
let analyser: any = undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('Vibe-Driven Development extension activated! 🎵');

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = '👩‍💻';
	statusBarItem.tooltip = 'Vibe Companion - Click to toggle UI';
	statusBarItem.command = 'vibe-driven-development.toggleUI';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

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

		musicEngine = new MusicEngine((data: MusicData) => {
			currentPanel?.webview.postMessage(data);
		});

		strudelGenerator = new StrudelGenerator();
		dialogueManager = new DialogueManager(true, 'normal');
		console.log('Dialogue manager initialized');

		activityDetector = new ActivityDetector((newState) => {
			console.log('📡 Activity state changed:', newState);
			updateStatusBar(newState);
			currentStateStartTime = Date.now();
			lastActivityTime = Date.now();

			currentPanel?.webview.postMessage({
				command: 'stateChanged',
				state: newState
			});

			currentPanel?.webview.postMessage({
				command: 'updateAvatarState',
				state: newState
			});

			sendStateMessage(newState);

			if (musicStarted && !isPaused) {
				if (musicMode === 'automatic') {
					musicEngine?.playStateMusic(newState);
				} else {
					const playlist = STATE_PLAYLISTS[newState] || [];
					currentPanel?.webview.postMessage({
						command: 'playPlaylist',
						playlist: playlist
					});
				}
			}
			handleDialogue(newState);
		});

		if (activityDetector) {
			testRunner = new TestRunner(activityDetector);
		}

		if (durationInterval) clearInterval(durationInterval);
		durationInterval = setInterval(() => {
			if (!isPaused && musicStarted) {
				const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
				currentPanel?.webview.postMessage({
					command: 'updateDuration',
					duration: elapsed
				});
			}
		}, 1000);

		setTimeout(() => {
			currentPanel?.webview.postMessage({
				command: 'init',
				musicMode: musicMode,
				isPaused: isPaused,
				theme: currentTheme
			});
		}, 100);

		currentPanel.webview.onDidReceiveMessage(
			message => {
				console.log('Extension received message:', message.command);
				
				switch (message.command) {
					case 'vibeChanged':
						console.log('Vibe changed to:', message.vibe);
						if (musicEngine) {
							musicEngine.setVibe(message.vibe);
						}
						break;
					
					case 'startMusic':
						console.log('Starting music...');
   						musicStarted = true;
    					sessionStartTime = Date.now();
    					const currentState = activityDetector?.getCurrentState() || 'idle';
    
    					if (musicMode === 'automatic') {
        					console.log('Auto mode: Using music engine for', currentState);
        					musicEngine?.playStateMusic(currentState); // This plays synthesized music
    					} else {
        					console.log('Playlist mode: Using curated playlists for', currentState);
        
        					// Get playlist from curated.ts and open YouTube
        					const playlist = STATE_PLAYLISTS[currentState] || [];
        
        					// This triggers the playPlaylist case to open YouTube
        					currentPanel?.webview.postMessage({
            				command: 'playPlaylist', 
            				playlist: playlist,
            				state: currentState
			});
    		}
    
    		currentPanel?.webview.postMessage({
    		    command: 'musicStarted'
    		});
    		break;
				
					
					case 'pauseMusic':
						console.log('Toggling pause...');
						isPaused = !isPaused;
						if (isPaused) {
							musicEngine?.pause();
							activityDetector?.pause();
						} else {
							musicEngine?.resume();
							activityDetector?.resume();
						}
						currentPanel?.webview.postMessage({
							command: 'pauseStateChanged',
							isPaused: isPaused
						});
						break;
					
					case 'changeTheme':
						console.log('Theme change:', message.theme);
						currentTheme = message.theme;
						currentPanel?.webview.postMessage({
							command: 'applyTheme',
							theme: message.theme
						});
						break;
					
					case 'changeBeats':
						console.log('Changing beats:', message.value);
						if (strudelGenerator) {
							strudelGenerator.changeBeats(message.value);
						}
						break;
					
					case 'changeRhythm':
						console.log('Changing rhythm:', message.value);
						if (strudelGenerator) {
							strudelGenerator.changeRhythm(message.value);
						}
						break;
					
					case 'changeSpeed':
						console.log('Changing speed:', message.value);
						if (strudelGenerator) {
							strudelGenerator.changeSpeed(message.value);
						}
						break;
					
					case 'toggleUI':
						console.log('Toggling UI');
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
					
					case 'testDialogue':
						console.log('Testing dialogue...');
						const testQuote = dialogueManager?.getRandomQuote('triumph');
						if (testQuote) {
							currentPanel?.webview.postMessage({
								command: 'showDialogueToast',
								quote: testQuote.text + ' - ' + testQuote.source
							});
						}
						break;

					case 'setDialogueFrequency':
						console.log('Setting dialogue frequency:', message.frequency);
						if (dialogueManager) {
							dialogueManager.setEnabled(message.frequency !== 'off');
							dialogueManager.setFrequency(message.frequency);
						}
						break;
					
					case 'playPlaylist':
    					console.log('Playing playlist for state:', message.state);
    					if (message.playlist && message.playlist.length > 0) {
        					const selectedPlaylist = message.playlist[0];
        					console.log('Opening playlist:', selectedPlaylist.title, selectedPlaylist.url);
        
       					vscode.env.openExternal(vscode.Uri.parse(selectedPlaylist.url)).then(() => {
            				console.log('Playlist opened successfully');
            					currentPanel?.webview.postMessage({
                				command: 'playlistOpened',
                				title: selectedPlaylist.title,
                				url: selectedPlaylist.url
            				});
        				}).catch((error) => {
            				console.error('Error opening playlist:', error);
            					currentPanel?.webview.postMessage({
                				command: 'playlistError',
                				error: 'Failed to open playlist. Please try again.'
            				});
        				});
    					} else {
        					console.warn('No playlists available for state:', message.state);
        					currentPanel?.webview.postMessage({
            				command: 'playlistError',
            				error: 'No playlists available for this state.'
       			 		});
    					}
    					break;

					case 'toggleVisualization':
						console.log('Toggling visualization:', message.type);
						currentPanel?.webview.postMessage({
							command: 'visualizationToggled',
							type: message.type
						});
						break;

					case 'toggleNightMode':
						console.log('Toggling night mode');
						currentPanel?.webview.postMessage({
							command: 'nightModeToggled'
						});
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
			if (durationInterval) clearInterval(durationInterval);
		});
	});

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
		isPaused = !isPaused;
		if (isPaused) {
			musicEngine?.pause();
			activityDetector?.pause();
		} else {
			musicEngine?.resume();
			activityDetector?.resume();
		}
		currentPanel?.webview.postMessage({
			command: 'pauseStateChanged',
			isPaused: isPaused
		});
	});

	let customizeAvatar = vscode.commands.registerCommand('vibe-driven-development.customizeAvatar', async () => {
		const themes = ['cyberpunk', 'cozy', 'minimal', 'neon'];
		const selected = await vscode.window.showQuickPick(themes, {
			placeHolder: 'Select avatar theme'
		});
		if (selected) {
			currentTheme = selected;
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

	vscode.commands.executeCommand('vibe-driven-development.showCompanion');
}

export function deactivate() {
	if (durationInterval) clearInterval(durationInterval);
	activityDetector?.dispose();
	musicEngine?.dispose();
	strudelGenerator?.dispose();
	testRunner?.dispose();
	currentPanel?.dispose();
}

function updateStatusBar(state: ActivityState) {
	if (!statusBarItem) {
		return;
	}
	
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
	if (!dialogueManager) {
		console.log('Dialogue manager not initialized');
		return;
	}

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
		case 'procrastinating':
			context = 'motivation';
			break;
		case 'testing':
			context = 'motivation';
			break;
		case 'building':
			context = 'motivation';
			break;
	}

	if (context) {
		console.log('Attempting dialogue for context:', context);
		const quote = await dialogueManager.playDialogue(context, sessionDuration);
		if (quote) {
			console.log('Showing quote:', quote.text);
			currentPanel?.webview.postMessage({
				command: 'showDialogueToast',
				quote: quote.text + ' - ' + quote.source
			});
		}
	}
}

function sendStateMessage(state: ActivityState) {
	const currentVibe = musicEngine?.['currentVibe'] || 'encouraging';

	const messages: Record<string, Record<string, string>> = {
		encouraging: {
			idle: "Ready when you are! 💪",
			productive: "You're crushing it! 🔥",
			stuck: "Take a breath, you got this! 🌟",
			procrastinating: "Let's get back to coding! 💪",
			testing: "Fingers crossed! 🤞",
			building: "Building something awesome! 🔨",
			test_passed: "YES! I knew you could do it! 🎉",
			test_failed: "It's okay, we'll fix it together! 💙"
		},
		roasting: {
			idle: "gonna code or just stare? 👀",
			productive: "wow actually working for once",
			stuck: "stackoverflow isn't gonna solve this one chief",
			procrastinating: "still procrastinating huh",
			testing: "let's see how badly this fails",
			building: "finally building something?",
			test_passed: "finally lmao 💀",
			test_failed: "skill issue fr fr"
		},
		neutral: {
			idle: "System ready.",
			productive: "Optimal productivity detected.",
			stuck: "Analyzing bottleneck...",
			procrastinating: "Idle state detected.",
			testing: "Running tests...",
			building: "Compilation in progress.",
			test_passed: "Tests passing. Continuing.",
			test_failed: "Test failure. Debugging recommended."
		}
	};

	const vibeMessages = messages[currentVibe] || messages.encouraging;
	const message = vibeMessages[state] || vibeMessages.idle;

	currentPanel?.webview.postMessage({
		command: 'showStateMessage',
		message: message
	});
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
				--glow-color: #00ffcc;
				--glow-color-accent: #ff00ff;
				--bg-primary: #0a0e27;
				--bg-secondary: #1a1a2e;
				--bg-tertiary: #16213e;
				--text-primary: #00ffcc;
				--text-secondary: #ffffff;
				--particle-color: #00ffcc;
			}

			body {
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
				color: var(--text-secondary);
				background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
				padding: 20px;
				overflow-y: auto;
				position: relative;
				transition: background 0.5s ease;
				min-height: 100vh;
			}

			body.night-mode {
				--bg-primary: #0a0a0a;
				--bg-secondary: #1a1a1a;
				--bg-tertiary: #2a2a2a;
				--text-secondary: #e0e0e0;
				filter: brightness(0.85);
			}

			body.theme-cozy {
				--bg-primary: #f5e6d3;
				--bg-secondary: #ebe0d1;
				--bg-tertiary: #e0d5c7;
				--glow-color: #ff9966;
				--glow-color-accent: #ffcc99;
				--text-primary: #8b6f47;
				--text-secondary: #5c4033;
				--particle-color: #ff9966;
			}

			body.theme-minimal {
				--bg-primary: #f5f5f5;
				--bg-secondary: #e8e8e8;
				--bg-tertiary: #d0d0d0;
				--glow-color: #333333;
				--glow-color-accent: #666666;
				--text-primary: #333333;
				--text-secondary: #000000;
				--particle-color: #666666;
			}

			body.theme-neon {
				--bg-primary: #0d0221;
				--bg-secondary: #1a0033;
				--bg-tertiary: #2d004d;
				--glow-color: #ff00ff;
				--glow-color-accent: #00ffff;
				--text-primary: #ff00ff;
				--text-secondary: #ffffff;
				--particle-color: #00ffff;
			}

			.background-animation {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				z-index: -1;
				pointer-events: none;
				background: linear-gradient(45deg, var(--bg-primary), var(--bg-secondary), var(--bg-tertiary), var(--bg-primary));
				background-size: 400% 400%;
				animation: gradientShift 15s ease infinite;
			}

			@keyframes gradientShift {
				0% { background-position: 0% 50%; }
				50% { background-position: 100% 50%; }
				100% { background-position: 0% 50%; }
			}

			.visualizer-panel {
				position: fixed;
				bottom: 20px;
				left: 20px;
				width: 280px;
				background: var(--bg-secondary);
				border: 2px solid var(--glow-color);
				border-radius: 8px;
				padding: 15px;
				z-index: 1000;
				box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
				display: none;
			}

			.visualizer-panel.active {
				display: block;
				animation: slideInLeft 0.3s ease-out;
			}

			@keyframes slideInLeft {
				from {
					transform: translateX(-300px);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}

			.visualizer-title {
				font-size: 12px;
				color: var(--glow-color);
				margin-bottom: 10px;
				text-transform: uppercase;
				font-weight: bold;
				letter-spacing: 2px;
			}

			#waveform {
				width: 100%;
				height: 80px;
				background: var(--bg-tertiary);
				border-radius: 4px;
				border: 1px solid var(--glow-color);
			}

			/* Dropdown Menu Styles */
			.dropdown-menu {
				position: fixed;
				top: 20px;
				right: 20px;
				z-index: 999;
			}

			.dropdown-toggle {
				width: 40px;
				height: 40px;
				background: var(--bg-secondary);
				border: 2px solid var(--glow-color);
				border-radius: 50%;
				color: var(--text-primary);
				cursor: pointer;
				font-size: 18px;
				display: flex;
				align-items: center;
				justify-content: center;
				transition: all 0.3s ease;
				box-shadow: 0 0 10px rgba(0, 255, 204, 0.3);
			}

			.dropdown-toggle:hover {
				box-shadow: 0 0 20px var(--glow-color);
				transform: scale(1.1);
			}

			.dropdown-content {
				position: absolute;
				top: 50px;
				right: 0;
				background: var(--bg-secondary);
				border: 2px solid var(--glow-color);
				border-radius: 8px;
				padding: 10px;
				min-width: 200px;
				box-shadow: 0 0 20px rgba(0, 255, 204, 0.3);
				display: none;
				flex-direction: column;
				gap: 8px;
			}

			.dropdown-content.active {
				display: flex;
				animation: slideInDown 0.3s ease-out;
			}

			@keyframes slideInDown {
				from {
					transform: translateY(-10px);
					opacity: 0;
				}
				to {
					transform: translateY(0);
					opacity: 1;
				}
			}

			.dropdown-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
				padding: 8px 12px;
				background: var(--bg-tertiary);
				border: 1px solid var(--glow-color);
				border-radius: 4px;
				color: var(--text-secondary);
				font-size: 12px;
				cursor: pointer;
				transition: all 0.3s ease;
			}

			.dropdown-item:hover {
				background: var(--glow-color);
				color: var(--bg-primary);
				box-shadow: 0 0 10px var(--glow-color);
			}

			.dropdown-item.active {
				background: var(--glow-color);
				color: var(--bg-primary);
			}

			.dropdown-checkmark {
				color: var(--text-primary);
				font-weight: bold;
				margin-left: 8px;
			}

			.dropdown-item.active .dropdown-checkmark {
				color: var(--bg-primary);
			}

			.dropdown-section {
				margin: 5px 0;
				padding: 5px 0;
				border-bottom: 1px solid var(--glow-color);
			}

			.dropdown-section-title {
				font-size: 11px;
				color: var(--glow-color);
				text-transform: uppercase;
				letter-spacing: 1px;
				margin-bottom: 5px;
				font-weight: bold;
			}

			.container {
				max-width: 500px;
				margin: 0 auto;
				text-align: center;
				position: relative;
				transition: all 0.3s ease;
				z-index: 10;
			}

			.container.compact {
				max-width: 220px;
			}

			.container.compact .vibe-selector,
			.container.compact .message,
			.container.compact .state,
			.container.compact .controls {
				display: none;
			}

			.container.compact h1 {
				display: none;
			}
			
			h1 { 
				margin-bottom: 20px; 
				font-size: 24px;
				color: var(--text-primary);
				text-shadow: 0 0 10px var(--glow-color);
			}
			
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
				bottom: 80px;
				right: 80px;
				z-index: 1000;
			}

			.avatar-wrapper.hidden {
				display: none;
			}

			.avatar-reactions {
				position: absolute;
				top: -50px;
				left: 50%;
				transform: translateX(-50%);
				font-size: 40px;
				opacity: 0;
				animation: floatUp 2s ease-out forwards;
			}

			@keyframes floatUp {
				0% {
					opacity: 1;
					transform: translateX(-50%) translateY(0);
				}
				100% {
					opacity: 0;
					transform: translateX(-50%) translateY(-60px);
				}
			}

			.image-avatar-container {
				position: relative;
				width: 200px;
				height: 200px;
				filter: drop-shadow(0 0 10px var(--glow-color));
				transition: filter 0.3s ease;
				border-radius: 10px;
				overflow: hidden;
				border: 2px solid var(--glow-color);
			}

			.avatar-image {
				width: 100%;
				height: 100%;
				object-fit: cover;
				border-radius: 8px;
			}

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

			@keyframes procrastinating-rock {
				0%, 100% { transform: rotate(-2deg); }
				50% { transform: rotate(2deg); }
			}

			.avatar-state-idle {
				animation: idle-breathing 4s ease-in-out infinite;
			}

			.avatar-state-productive {
				animation: typing 0.3s ease-in-out infinite;
			}

			.avatar-state-stuck {
				animation: stuck-thinking 3s ease-in-out infinite;
			}

			.avatar-state-procrastinating {
				animation: procrastinating-rock 2s ease-in-out infinite;
			}

			.avatar-state-test_failed {
				animation: error-shake 0.5s ease-in-out;
			}

			.avatar-state-test_passed {
				animation: success-bounce 1s ease-in-out;
			}

			.avatar-state-building {
				animation: building-pulse 2s ease-in-out infinite;
			}

			.thought-bubble {
				position: absolute;
				top: -40px;
				right: -20px;
				background: var(--bg-secondary);
				border: 2px solid var(--glow-color);
				border-radius: 50%;
				padding: 8px 12px;
				font-size: 18px;
				opacity: 0;
				transition: opacity 0.3s ease;
			}

			.thought-bubble.show {
				opacity: 1;
				animation: bounce 0.6s ease-out;
			}

			@keyframes bounce {
				0%, 100% { transform: translateY(0); }
				50% { transform: translateY(-10px); }
			}

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
				color: var(--particle-color);
				opacity: 0.4;
				font-family: 'Courier New', monospace;
				font-size: 11px;
				animation: float-around 10s linear infinite;
				text-shadow: 0 0 5px currentColor;
				font-weight: bold;
			}

			.code-particle.reactive-particle {
				animation: none;
			}

			@keyframes float-around {
				0% {
					transform: translate(0, 100vh) rotate(0deg);
					opacity: 0;
				}
				10% {
					opacity: 0.4;
				}
				90% {
					opacity: 0.4;
				}
				100% {
					transform: translate(100px, -100vh) rotate(360deg);
					opacity: 0;
				}
			}

			@keyframes particle-react-productive {
				0%, 100% { transform: translateY(0) scale(1); }
				50% { transform: translateY(-20px) scale(1.2); }
			}

			@keyframes particle-react-stuck {
				0%, 100% { transform: rotate(0deg) scale(1); }
				50% { transform: rotate(15deg) scale(1.1); }
			}

			.particle-react-productive {
				animation: particle-react-productive 0.6s ease-out !important;
			}

			.particle-react-stuck {
				animation: particle-react-stuck 0.6s ease-out !important;
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
				border: 2px solid var(--glow-color);
				background: var(--bg-secondary);
				color: var(--text-primary);
				cursor: pointer;
				border-radius: 6px;
				font-size: 14px;
				transition: all 0.3s ease;
				font-weight: bold;
				text-shadow: 0 0 5px rgba(0, 255, 204, 0.5);
			}

			.vibe-btn:hover {
				box-shadow: 0 0 15px var(--glow-color);
				transform: translateY(-2px);
			}

			.vibe-btn.active {
				background: var(--glow-color);
				color: var(--bg-primary);
				box-shadow: 0 0 20px var(--glow-color);
			}

			.message {
				font-size: 16px;
				margin: 20px 0;
				padding: 15px;
				background: var(--bg-secondary);
				border-radius: 8px;
				border: 1px solid var(--glow-color);
				min-height: 60px;
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
			}

			.state {
				font-size: 12px;
				color: var(--glow-color);
				margin-top: 10px;
				text-transform: uppercase;
				font-weight: bold;
				letter-spacing: 1px;
			}

			.duration {
				font-size: 12px;
				color: var(--text-secondary);
				margin-top: 5px;
				opacity: 0.8;
			}

			.controls {
				margin: 30px 0;
				display: grid;
				grid-template-columns: repeat(2, 1fr);
				gap: 10px;
				align-items: center;
				max-width: 320px;
				margin-left: auto;
				margin-right: auto;
			}

			.control-row {
				display: contents;
			}

			.control-btn {
				padding: 10px 15px;
				border: 1px solid var(--glow-color);
				background: var(--bg-secondary);
				color: var(--text-primary);
				cursor: pointer;
				border-radius: 4px;
				font-size: 13px;
				transition: all 0.3s ease;
				min-width: 0;
				font-weight: bold;
				text-shadow: 0 0 3px rgba(0, 255, 204, 0.5);
			}

			.control-btn:hover {
				box-shadow: 0 0 10px var(--glow-color);
				transform: translateY(-1px);
			}

			.control-btn:active {
				transform: translateY(0);
			}

			.control-select {
				padding: 10px 15px;
				border: 1px solid var(--glow-color);
				background: var(--bg-secondary);
				color: var(--text-primary);
				cursor: pointer;
				border-radius: 4px;
				font-size: 13px;
				transition: all 0.3s ease;
				min-width: 0;
				font-weight: bold;
			}

			.control-select:hover {
				box-shadow: 0 0 10px var(--glow-color);
			}

			.control-select:focus {
				outline: 1px solid var(--glow-color);
				box-shadow: 0 0 15px var(--glow-color);
			}

			.control-select option {
				background: var(--bg-secondary);
				color: var(--text-primary);
			}

			.toast {
				position: fixed;
				bottom: 320px;
				right: 20px;
				background: var(--bg-secondary);
				border: 2px solid var(--glow-color);
				border-radius: 8px;
				padding: 15px 20px;
				max-width: 300px;
				z-index: 10000;
				animation: slideIn 0.3s ease-out, slideOut 0.3s ease-out 4.7s forwards;
				box-shadow: 0 0 20px rgba(0, 255, 204, 0.5);
				color: var(--text-secondary);
			}

			@keyframes slideIn {
				from {
					transform: translateX(400px);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}

			@keyframes slideOut {
				from {
					transform: translateX(0);
					opacity: 1;
				}
				to {
					transform: translateX(400px);
					opacity: 0;
				}
			}
			.playlist-toast {
	position: fixed;
	bottom: 360px;
	right: 20px;
	background: var(--bg-secondary);
	border: 2px solid #4ade80;
	border-radius: 8px;
	padding: 15px 20px;
	max-width: 300px;
	z-index: 10001;
	animation: slideIn 0.3s ease-out, slideOut 0.3s ease-out 3.7s forwards;
	box-shadow: 0 0 20px rgba(74, 222, 128, 0.5);
	color: #4ade80;
	font-weight: bold;
	letter-spacing: 0.5px;
}

.error-toast {
	position: fixed;
	bottom: 400px;
	right: 20px;
	background: var(--bg-secondary);
	border: 2px solid #ef4444;
	border-radius: 8px;
	padding: 15px 20px;
	max-width: 300px;
	z-index: 10001;
	animation: slideIn 0.3s ease-out, slideOut 0.3s ease-out 4.7s forwards;
	box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
	color: #ef4444;
	font-weight: bold;
	letter-spacing: 0.5px;
}
		</style>
	</head>
	<body>
		<div class="background-animation"></div>

		<!-- Dropdown Menu -->
		<div class="dropdown-menu">
    <button class="dropdown-toggle" id="dropdownToggle">⋯</button>
    <div class="dropdown-content" id="dropdownContent">
        <div class="dropdown-section">
            <div class="dropdown-section-title">Visualizations</div>
            <div class="dropdown-item" data-action="toggleWaveform">
                <span>🎵 Waveform</span>
                <span class="dropdown-checkmark" id="waveformCheckmark">✓</span>
            </div>
            <div class="dropdown-item" data-action="toggleParticles">
                <span>✨ Particles</span>
                <span class="dropdown-checkmark" id="particlesCheckmark">✓</span>
            </div>
        </div>
        
        <div class="dropdown-section">
            <div class="dropdown-section-title">Theme</div>
            <div class="dropdown-item" data-action="setTheme" data-theme="cyberpunk">
                <span>Cyberpunk</span>
                <span class="dropdown-checkmark" id="themeCyberpunkCheckmark">✓</span>
            </div>
            <div class="dropdown-item" data-action="setTheme" data-theme="cozy">
                <span>Cozy</span>
                <span class="dropdown-checkmark" id="themeCozyCheckmark"></span>
            </div>
            <div class="dropdown-item" data-action="setTheme" data-theme="minimal">
                <span>Minimal</span>
                <span class="dropdown-checkmark" id="themeMinimalCheckmark"></span>
            </div>
            <div class="dropdown-item" data-action="setTheme" data-theme="neon">
                <span>Neon</span>
                <span class="dropdown-checkmark" id="themeNeonCheckmark"></span>
            </div>
        </div>

        <div class="dropdown-section">
            <div class="dropdown-section-title">Settings</div>
            <div class="dropdown-item" data-action="toggleNightMode">
                <span>🌙 Night Mode</span>
                <span class="dropdown-checkmark" id="nightModeCheckmark"></span>
            </div>
            <div class="dropdown-item" data-action="toggleReactions">
                <span>🎭 Reactions</span>
                <span class="dropdown-checkmark" id="reactionsCheckmark">✓</span>
            </div>
            <div class="dropdown-item" data-action="toggleAnimations">
                <span>🎬 Animations</span>
                <span class="dropdown-checkmark" id="animationsCheckmark">✓</span>
            </div>
        </div>
        
        <div class="dropdown-item" data-action="testDialogue">
            <span>💬 Test Quote</span>
            <span class="dropdown-checkmark"></span>
        </div>
        
        <div class="dropdown-section" style="border-top: 1px solid var(--glow-color); margin-top: 8px;">
            <div class="dropdown-section-title">Dialogue Frequency</div>
            <select id="dialogueFrequencyDropdown" style="width: 100%; padding: 6px; background: var(--bg-tertiary); border: 1px solid var(--glow-color); color: var(--text-secondary); border-radius: 4px;">
                <option value="off">Off</option>
                <option value="rare">Rare (30m)</option>
                <option value="normal" selected>Normal (10m)</option>
                <option value="frequent">Frequent (5m)</option>
            </select>
        </div>
    </div>
</div>

<div class="visualizer-panel" id="visualizerPanel">
    <div class="visualizer-title">🎵 Waveform</div>
    <canvas id="waveform"></canvas>
</div>

<div class="container" id="mainContainer">
    <h1>🎵 Vibe Companion</h1>

    <div class="vibe-selector">
        <button class="vibe-btn active" data-vibe="encouraging">😊 Encouraging</button>
        <button class="vibe-btn" data-vibe="roasting">😏 Roasting</button>
        <button class="vibe-btn" data-vibe="neutral">🤖 Neutral</button>
    </div>

    <div class="avatar-wrapper" id="avatarWrapper">
        <div class="avatar-state-idle" id="avatarState">
            <div class="avatar-reactions" id="avatarReactions"></div>
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

    <div class="duration" id="duration">
        Duration: 0s
    </div>

    <div class="controls">
        <button class="control-btn" id="startMusicBtn">🎵 Start</button>
        <button class="control-btn" id="musicModeBtn">Auto</button>
        <button class="control-btn" id="pauseBtn">⏸️ Pause</button>
        <select class="control-select" id="beatsSelect">
            <option value="default">Beats</option>
            <option value="kick">Kick</option>
            <option value="snare">Snare</option>
            <option value="hihat">Hi-Hat</option>
            <option value="clap">Clap</option>
            <option value="tom">Tom</option>
        </select>
        <select class="control-select" id="rhythmSelect">
            <option value="default">Rhythm</option>
            <option value="straight">Straight</option>
            <option value="swing">Swing</option>
            <option value="shuffle">Shuffle</option>
            <option value="triplet">Triplet</option>
            <option value="polyrhythm">Polyrhythm</option>
        </select>
        <select class="control-select" id="speedSelect">
            <option value="default">Speed</option>
            <option value="slow">Slow</option>
            <option value="medium">Medium</option>
            <option value="fast">Fast</option>
            <option value="very-fast">Very Fast</option>
        </select>
    </div>
</div>
		<script>
    const vscode = acquireVsCodeApi();

    let currentVibe = 'encouraging';
    let currentState = 'idle';
    let isPaused = false;
    let currentTheme = 'cyberpunk';
    let isCompact = false;
    let musicMode = 'automatic';
    let particlesEnabled = true;
    let reactionsEnabled = true;
    let animationsEnabled = true;
    let nightModeEnabled = false;
    let waveformEnabled = false;
    let audioContext = null;
    let analyser = null;
    let animationFrameId = null;

    const imageUris = ${JSON.stringify(Object.fromEntries(Object.entries(imageUris).map(([k, v]) => [k, v.toString()])))};

    const stateReactions = {
        productive: '⚡',
        stuck: '🤔',
        test_passed: '🎉',
        test_failed: '😵',
        building: '🔨',
        idle: '😴',
        procrastinating: '🌙'
    };

    // Dropdown functionality
    function toggleDropdown() {
        const dropdown = document.getElementById('dropdownContent');
        dropdown.classList.toggle('active');
    }

    function closeDropdown() {
        document.getElementById('dropdownContent').classList.remove('active');
    }

    function updateDropdownVisuals() {
        // Update checkmarks for visualizations
        document.getElementById('waveformCheckmark').textContent = waveformEnabled ? '✓' : '';
        document.getElementById('particlesCheckmark').textContent = particlesEnabled ? '✓' : '';
        
        // Update checkmarks for themes
        document.getElementById('themeCyberpunkCheckmark').textContent = currentTheme === 'cyberpunk' ? '✓' : '';
        document.getElementById('themeCozyCheckmark').textContent = currentTheme === 'cozy' ? '✓' : '';
        document.getElementById('themeMinimalCheckmark').textContent = currentTheme === 'minimal' ? '✓' : '';
        document.getElementById('themeNeonCheckmark').textContent = currentTheme === 'neon' ? '✓' : '';
        
        // Update checkmarks for settings
        document.getElementById('nightModeCheckmark').textContent = nightModeEnabled ? '✓' : '';
        document.getElementById('reactionsCheckmark').textContent = reactionsEnabled ? '✓' : '';
        document.getElementById('animationsCheckmark').textContent = animationsEnabled ? '✓' : '';
    }

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
        }
    }

    function drawWaveform() {
        if (!waveformEnabled || !analyser) return;

        const canvas = document.getElementById('waveform');
        if (!canvas) return;

        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-tertiary');
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const glowColor = getComputedStyle(document.body).getPropertyValue('--glow-color').trim();
        canvasCtx.strokeStyle = glowColor;
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();

        animationFrameId = requestAnimationFrame(drawWaveform);
    }

    function generateCodeParticles() {
        const particlesContainer = document.getElementById('codeParticles');
        if (!particlesContainer) return;
        
        particlesContainer.innerHTML = '';

        if (!particlesEnabled) return;

        const codeSnippets = ['{', '}', '()', '=>', 'const', 'let', 'function', 'class', 'import', 'export', '</', '/>'];

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

    function reactiveParticleEffect(state) {
        if (!particlesEnabled || !reactionsEnabled) return;

        const particlesContainer = document.getElementById('codeParticles');
        if (!particlesContainer) return;
        
        const particles = particlesContainer.querySelectorAll('.code-particle');

        particles.forEach((particle, index) => {
            setTimeout(() => {
                if (state === 'productive' || state === 'building') {
                    particle.classList.add('particle-react-productive');
                } else if (state === 'stuck') {
                    particle.classList.add('particle-react-stuck');
                }

                setTimeout(() => {
                    particle.classList.remove('particle-react-productive', 'particle-react-stuck');
                }, 600);
            }, index * 50);
        });
    }

    function triggerAvatarReaction(state) {
        if (!reactionsEnabled) return;

        const reaction = stateReactions[state];
        if (!reaction) return;

        const reactionsContainer = document.getElementById('avatarReactions');
        if (!reactionsContainer) return;
        
        reactionsContainer.textContent = reaction;
        reactionsContainer.style.opacity = '1';

        setTimeout(() => {
            reactionsContainer.style.opacity = '0';
        }, 1800);
    }

    function updateAvatarState(state) {
        currentState = state;
        const stateElement = document.getElementById('state');
        if (stateElement) {
            stateElement.textContent = 'State: ' + state;
        }

        const avatarState = document.getElementById('avatarState');
        if (avatarState) {
            if (animationsEnabled) {
                avatarState.className = 'avatar-state-' + state;
            } else {
                avatarState.className = '';
            }
        }

        const avatarImg = document.getElementById('avatarImage');
        if (avatarImg) {
            const imageSrc = imageUris[state] || imageUris['idle'] || '';
            if (imageSrc) {
                avatarImg.src = imageSrc;
                avatarImg.style.display = 'block';
                avatarImg.onerror = function() {
                    console.log('Image failed to load:', imageSrc);
                    avatarImg.style.display = 'none';
                };
            } else {
                console.log('No image source found for state:', state);
                avatarImg.style.display = 'none';
            }
        }

        if (state === 'stuck') {
            showThoughtBubble('🤔');
        } else if (state === 'test_failed') {
            showThoughtBubble('😵');
        } else {
            hideThoughtBubble();
        }

        reactiveParticleEffect(state);
        triggerAvatarReaction(state);
    }

    function toggleCompact() {
        isCompact = !isCompact;
        const container = document.getElementById('mainContainer');
        if (container) {
            if (isCompact) {
                container.classList.add('compact');
            } else {
                container.classList.remove('compact');
            }
        }
    }

    function toggleMusicMode() {
        musicMode = musicMode === 'automatic' ? 'playlist' : 'automatic';
        const btn = document.getElementById('musicModeBtn');
        if (btn) {
            btn.textContent = musicMode === 'automatic' ? 'Auto' : 'Playlist';
        }
        vscode.postMessage({ command: 'toggleMusicMode' });
    }

    function showThoughtBubble(emoji) {
        const bubble = document.getElementById('thoughtBubble');
        if (bubble) {
            bubble.textContent = emoji;
            bubble.classList.add('show');
            setTimeout(function() {
                hideThoughtBubble();
            }, 3000);
        }
    }

    function hideThoughtBubble() {
        const bubble = document.getElementById('thoughtBubble');
        if (bubble) {
            bubble.classList.remove('show');
        }
    }

    let currentMusic = null;

    function playMusic(state, vibe) {
        stopMusic();

        // This is a placeholder - actual music would be handled by the extension
        console.log('Would play music for state:', state, 'vibe:', vibe);
    }

    function stopMusic() {
        if (currentMusic) {
            currentMusic.stop();
            currentMusic.dispose();
            currentMusic = null;
        }
    }

    function updatePersonalityMessage(vibe) {
        const messages = {
            encouraging: 'Ready to vibe! Start coding...',
            roasting: 'What are you waiting for? Code already!',
            neutral: 'Systems online. Awaiting input.'
        };
        const messageElement = document.getElementById('message');
        if (messageElement) {
            messageElement.textContent = messages[vibe] || messages.encouraging;
        }
    }

    function showDialogueToast(quote) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = quote;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    function showPlaylistToast(message) {
        const existingToast = document.querySelector('.playlist-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'playlist-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    function showErrorToast(message) {
        const existingToast = document.querySelector('.error-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = '⚠️ ' + message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    function applyTheme(theme) {
        if (currentTheme === theme) {
            return; // Don't send message if theme hasn't changed
        }
        document.body.classList.remove('theme-cyberpunk', 'theme-cozy', 'theme-minimal', 'theme-neon');
        if (theme !== 'default') {
            document.body.classList.add('theme-' + theme);
            currentTheme = theme;
            generateCodeParticles();
            updateDropdownVisuals();
            vscode.postMessage({ command: 'changeTheme', theme: theme });
        }
    }

    function toggleNightMode() {
        nightModeEnabled = !nightModeEnabled;
        document.body.classList.toggle('night-mode');
        updateDropdownVisuals();
    }

    function toggleWaveform() {
        waveformEnabled = !waveformEnabled;
        const visualizerPanel = document.getElementById('visualizerPanel');
        if (visualizerPanel) {
            visualizerPanel.classList.toggle('active');
        }

        if (waveformEnabled) {
            initAudioContext();
            drawWaveform();
        } else if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        updateDropdownVisuals();
    }

    function toggleParticles() {
        particlesEnabled = !particlesEnabled;
        if (particlesEnabled) {
            generateCodeParticles();
        } else {
            const particlesContainer = document.getElementById('codeParticles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
            }
        }
        updateDropdownVisuals();
    }

    function toggleReactions() {
        reactionsEnabled = !reactionsEnabled;
        updateDropdownVisuals();
    }

    function toggleAnimations() {
        animationsEnabled = !animationsEnabled;
        const avatarState = document.getElementById('avatarState');
        if (avatarState) {
            if (animationsEnabled) {
                avatarState.className = 'avatar-state-' + currentState;
            } else {
                avatarState.className = '';
            }
        }
        updateDropdownVisuals();
    }

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Webview loaded');
        
        updateAvatarState('idle');
        updatePersonalityMessage('encouraging');
        generateCodeParticles();
        updateDropdownVisuals();

        // Dropdown event listeners - FIXED
        const dropdownToggle = document.getElementById('dropdownToggle');
        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleDropdown();
            });
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown-menu')) {
                closeDropdown();
            }
        });

        // Dropdown item click handlers - FIXED
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                const action = this.dataset.action;
                const theme = this.dataset.theme;

                switch (action) {
                    case 'toggleWaveform':
                        toggleWaveform();
                        break;
                    case 'toggleParticles':
                        toggleParticles();
                        break;
                    case 'setTheme':
                        if (theme) {
                            applyTheme(theme);
                        }
                        break;
                    case 'toggleNightMode':
                        toggleNightMode();
                        break;
                    case 'toggleReactions':
                        toggleReactions();
                        break;
                    case 'toggleAnimations':
                        toggleAnimations();
                        break;
                    case 'testDialogue':
                        console.log('Test dialogue clicked');
                        vscode.postMessage({ command: 'testDialogue' });
                        closeDropdown();
                        break;
                }
                closeDropdown();
            });
        });

        // Dialogue frequency dropdown
        const dialogueFrequency = document.getElementById('dialogueFrequencyDropdown');
        if (dialogueFrequency) {
            dialogueFrequency.addEventListener('change', function(e) {
                e.stopPropagation();
                const value = this.value;
                console.log('Dialogue frequency changed:', value);
                vscode.postMessage({ command: 'setDialogueFrequency', frequency: value });
            });
        }

        // Avatar click to toggle compact mode
        const avatarWrapper = document.getElementById('avatarWrapper');
        if (avatarWrapper) {
            avatarWrapper.addEventListener('click', function(e) {
                if (!e.target.closest('.thought-bubble')) {
                    toggleCompact();
                }
            });
        }

        // Vibe buttons
        document.querySelectorAll('.vibe-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.vibe-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                currentVibe = btn.dataset.vibe;
                updatePersonalityMessage(currentVibe);
                vscode.postMessage({ command: 'vibeChanged', vibe: currentVibe });
            });
        });

        // Control buttons
        const startMusicBtn = document.getElementById('startMusicBtn');
        if (startMusicBtn) {
            startMusicBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                console.log('Start music clicked');
                
                if (Tone.context.state !== 'running') {
                    await Tone.start();
                    console.log('Tone.js started');
                }
                
                vscode.postMessage({ command: 'startMusic' });
            });
        }

        const musicModeBtn = document.getElementById('musicModeBtn');
        if (musicModeBtn) {
            musicModeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('Music mode clicked');
                toggleMusicMode();
            });
        }

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('Pause clicked');
                vscode.postMessage({ command: 'pauseMusic' });
            });
        }

        // Select controls
        const beatsSelect = document.getElementById('beatsSelect');
        if (beatsSelect) {
            beatsSelect.addEventListener('change', function(e) {
                e.stopPropagation();
                const value = e.target.value;
                console.log('Beats selected:', value);
                if (value !== 'default') {
                    vscode.postMessage({ command: 'changeBeats', value: value });
                    e.target.value = 'default';
                }
            });
        }

        const rhythmSelect = document.getElementById('rhythmSelect');
        if (rhythmSelect) {
            rhythmSelect.addEventListener('change', function(e) {
                e.stopPropagation();
                const value = e.target.value;
                console.log('Rhythm selected:', value);
                if (value !== 'default') {
                    vscode.postMessage({ command: 'changeRhythm', value: value });
                    e.target.value = 'default';
                }
            });
        }

        const speedSelect = document.getElementById('speedSelect');
        if (speedSelect) {
            speedSelect.addEventListener('change', function(e) {
                e.stopPropagation();
                const value = e.target.value;
                console.log('Speed selected:', value);
                if (value !== 'default') {
                    vscode.postMessage({ command: 'changeSpeed', value: value });
                    e.target.value = 'default';
                }
            });
        }

        console.log('All event listeners attached');
    });

    // Message handler from extension
    window.addEventListener('message', function(event) {
        const message = event.data;
        console.log('Webview received:', message.command);

        switch (message.command) {
            case 'init':
                console.log('Initialized with mode:', message.musicMode);
                musicMode = message.musicMode;
                isPaused = message.isPaused || false;
                currentTheme = message.theme || 'cyberpunk';
                const musicModeBtn = document.getElementById('musicModeBtn');
                if (musicModeBtn) {
                    musicModeBtn.textContent = musicMode === 'automatic' ? 'Auto' : 'Playlist';
                }
                const pauseBtn = document.getElementById('pauseBtn');
                if (pauseBtn) {
                    pauseBtn.textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
                }
                if (currentTheme !== 'default') {
                    applyTheme(currentTheme);
                }
                updateDropdownVisuals();
                break;
            
            case 'musicStarted':
                const startBtn = document.getElementById('startMusicBtn');
                if (startBtn) {
                    startBtn.textContent = '🎵 Playing';
                    startBtn.style.opacity = '0.6';
                }
                break;
            
            case 'stateChanged':
            case 'updateAvatarState':
                updateAvatarState(message.state);
                break;
            
            case 'playMusic':
                console.log('Playing music for:', message.state);
                playMusic(message.state, message.vibe);
                break;
            
            case 'pauseMusic':
                console.log('Pausing music');
                stopMusic();
                break;
            
            case 'stopMusic':
                stopMusic();
                break;
            
            case 'pauseStateChanged':
                isPaused = message.isPaused;
                const pauseButton = document.getElementById('pauseBtn');
                if (pauseButton) {
                    pauseButton.textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
                }
                if (isPaused) {
                    stopMusic();
                }
                break;
            
            case 'showDialogueToast':
                showDialogueToast(message.quote);
                break;
            
            case 'showStateMessage':
                const messageElement = document.getElementById('message');
                if (messageElement) {
                    messageElement.textContent = message.message;
                }
                break;
            
            case 'updateDuration':
                const durationElement = document.getElementById('duration');
                if (durationElement) {
                    const seconds = message.duration;
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    durationElement.textContent = 'Duration: ' + minutes + 'm ' + remainingSeconds + 's';
                }
                break;
            
            case 'toggleUI':
                toggleCompact();
                break;

            case 'applyTheme':
                applyTheme(message.theme);
                break;

            case 'visualizationToggled':
                console.log('Visualization toggled:', message.type);
                break;

            case 'nightModeToggled':
                console.log('Night mode toggled');
                break;
            
            case 'playlistOpened':
                console.log('Playlist opened:', message.title);
                showPlaylistToast('Now playing: ' + message.title + ' 🎵');
                break;
            case 'playlistError':
                console.log('Playlist error:', message.error);
                showErrorToast(message.error);
                break;
        }
    });
</script>
	</body>
</html>`;
}