import { ActivityState, MusicSource } from '../types';

export const CURATED_MUSIC: MusicSource[] = [
  {
    title: 'Chill Coding',
    url: 'https://example.com/chill',
    state: 'productive',
    vibe: 'neutral'
  },
  {
    title: 'Focus Flow',
    url: 'https://example.com/focus',
    state: 'productive',
    vibe: 'encouraging'
  },
  {
    title: 'Debug Mode',
    url: 'https://example.com/debug',
    state: 'stuck',
    vibe: 'neutral'
  },
  {
    title: 'Test Suite Vibes',
    url: 'https://example.com/testing',
    state: 'testing',
    vibe: 'encouraging'
  },
  {
    title: 'Build Complete',
    url: 'https://example.com/build',
    state: 'building',
    vibe: 'neutral'
  },
  {
    title: 'Victory Lap',
    url: 'https://example.com/victory',
    state: 'test_passed',
    vibe: 'encouraging'
  }
];

export function getCuratedMusic(state: ActivityState, vibe: string): MusicSource | undefined {
  return CURATED_MUSIC.find(m => m.state === state && m.vibe === vibe);
}

export function getAllCuratedMusic(): MusicSource[] {
  return CURATED_MUSIC;
}