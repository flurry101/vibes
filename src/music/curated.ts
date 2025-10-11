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

export const STATE_PLAYLISTS: Record<string, { type: string; url: string }[]> = {
  idle: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }, // lofi hip hop
    { type: 'spotify', url: 'spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM' }
  ],
  productive: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A' }, // lofi beats
    { type: 'youtube', url: 'https://musicforprogramming.net/latest/' }
  ],
  stuck: [
    { type: 'youtube', url: 'https://youtu.be/4xDzrJKXOOY' }, // ambient
  ],
  procrastinating: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=dwY7w0k3j2Y' }, // anxiety inducing
  ],
  testing: [
    { type: 'youtube', url: 'https://youtu.be/EApZmmYg_oQ?list=RDEApZmmYg_oQ' }, // suspenseful
  ],
  building: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=VBlFHuCzPgY' }, // elevator music
  ],
  test_passed: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ' }, // celebration
  ],
  test_failed: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=yJxCdh1Ps48' }, // sad trombone
  ]
};

export function getCuratedMusic(state: ActivityState, vibe: string): MusicSource | undefined {
  return CURATED_MUSIC.find(m => m.state === state && m.vibe === vibe);
}

export function getAllCuratedMusic(): MusicSource[] {
  return CURATED_MUSIC;
}