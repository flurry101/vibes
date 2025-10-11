import { ActivityState, MusicSource } from '../types';

export const CURATED_MUSIC: Record<ActivityState, MusicSource[]> = {
  idle: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }, // lofi hip hop
    { type: 'spotify', url: 'spotify:playlist:0vvXsWCC9xrXsKd4FyS8kM' }
  ],
  productive: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=5qap5aO4i9A' }, // lofi beats
    { type: 'youtube', url: 'https://musicforprogramming.net/latest/' }
  ],
  stuck: [
    { type: 'youtube', url: 'https://www.youtube.com/watch?v=DWcJFNfaw9c' }, // ambient
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

export function getCuratedMusic(state: ActivityState): MusicSource {
  const options = CURATED_MUSIC[state] || CURATED_MUSIC.idle;
  return options[Math.floor(Math.random() * options.length)];
}