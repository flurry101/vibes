import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { ActivityState, VibeMode, MusicMode } from '../types';
import { STATE_PLAYLISTS } from '../music/curated';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('ActivityState types', () => {
		const states: ActivityState[] = ['idle', 'productive', 'stuck', 'procrastinating', 'testing', 'building', 'test_passed', 'test_failed'];
		assert.strictEqual(states.length, 8);
		assert.ok(states.includes('idle'));
		assert.ok(states.includes('productive'));
	});

	test('VibeMode types', () => {
		const vibes: VibeMode[] = ['encouraging', 'roasting', 'neutral'];
		assert.strictEqual(vibes.length, 3);
		assert.ok(vibes.includes('encouraging'));
	});

	test('MusicMode types', () => {
		const modes: MusicMode[] = ['automatic', 'playlist'];
		assert.strictEqual(modes.length, 2);
		assert.ok(modes.includes('automatic'));
		assert.ok(modes.includes('playlist'));
	});

	test('State playlists exist', () => {
		const states: ActivityState[] = ['idle', 'productive', 'stuck', 'procrastinating', 'testing', 'building', 'test_passed', 'test_failed'];
		states.forEach(state => {
			assert.ok(STATE_PLAYLISTS[state], `Playlist for ${state} should exist`);
			assert.ok(Array.isArray(STATE_PLAYLISTS[state]), `Playlist for ${state} should be an array`);
		});
	});

	test('Playlist items have required properties', () => {
		Object.values(STATE_PLAYLISTS).forEach((playlist: any[]) => {
			playlist.forEach(item => {
				assert.ok(item.type, 'Playlist item should have type');
				assert.ok(item.url, 'Playlist item should have url');
				assert.strictEqual(typeof item.url, 'string', 'URL should be string');
			});
		});
	});

	test('Extension commands are registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		const expectedCommands = [
			'vibe-driven-development.showCompanion',
			'vibe-driven-development.toggleAvatar',
			'vibe-driven-development.minimizeAvatar',
			'vibe-driven-development.switchAnimationMode',
			'vibe-driven-development.pauseAnimations',
			'vibe-driven-development.customizeAvatar',
			'vibe-driven-development.resetPosition',
			'vibe-driven-development.toggleMusicMode'
		];

		expectedCommands.forEach(cmd => {
			assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
		});
	});
});
