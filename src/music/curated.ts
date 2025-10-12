// File 1: curated.ts - Complete playlist mappings
import { ActivityState } from '../types';

export interface PlaylistEntry {
  title: string;
  url: string;
  type: 'youtube' | 'spotify';
  duration?: string;
}

export const STATE_PLAYLISTS: Record<ActivityState, PlaylistEntry[]> = {
  idle: [
    {
      title: 'Lofi Hip Hop - Study & Relax',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      type: 'youtube',
      duration: '12h'
    },
    {
      title: 'Lofi Girl 24/7 Stream',
      url: 'https://www.youtube.com/watch?v=rUxyKA_-grg',
      type: 'youtube',
      duration: '24h'
    },
    {
      title: 'Chillhop Essentials',
      url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      type: 'youtube',
      duration: '8h'
    }
  ],
  productive: [
    {
      title: 'Deep Focus - Music for Studying',
      url: 'https://www.youtube.com/watch?v=WfijMQ8Ac-c',
      type: 'youtube',
      duration: '10h'
    },
    {
      title: 'Cyberpunk 2077 Music - Focus Mix',
      url: 'https://www.youtube.com/watch?v=8mVBHg8H_sY',
      type: 'youtube',
      duration: '3h'
    },
    {
      title: 'Focus Music Playlist',
      url: 'https://www.youtube.com/watch?v=1-6J6M4J2ck',
      type: 'youtube',
      duration: '2h'
    }
  ],
  stuck: [
    {
      title: 'Ambient Music for Coding - Relaxation',
      url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
      type: 'youtube',
      duration: '8h'
    },
    {
      title: 'Meditation Music - Deep Sleep',
      url: 'https://www.youtube.com/watch?v=lQuvsWqmY5c',
      type: 'youtube',
      duration: '8h'
    },
    {
      title: 'Calming Piano Music',
      url: 'https://www.youtube.com/watch?v=9FjhsyZ0KJ0',
      type: 'youtube',
      duration: '3h'
    }
  ],
  procrastinating: [
    {
      title: 'Upbeat Electronic Music - Get Motivated',
      url: 'https://www.youtube.com/watch?v=dwY7w0k3j2Y',
      type: 'youtube',
      duration: '1h'
    },
    {
      title: 'Fast Paced Electronic Mix',
      url: 'https://www.youtube.com/watch?v=B0cHlpTYAUo',
      type: 'youtube',
      duration: '2h'
    },
    {
      title: 'Energy Boost Music',
      url: 'https://www.youtube.com/watch?v=gbHN9H8TkJ8',
      type: 'youtube',
      duration: '1h'
    }
  ],
  testing: [
    {
      title: 'Instrumental Hip Hop - Concentration',
      url: 'https://www.youtube.com/watch?v=EApZmmYg_oQ',
      type: 'youtube',
      duration: '2h'
    },
    {
      title: 'Video Game Music - Retro Classics',
      url: 'https://www.youtube.com/watch?v=NvIJu9-sSVE',
      type: 'youtube',
      duration: '3h'
    },
    {
      title: 'Synthwave Retro Mix',
      url: 'https://www.youtube.com/watch?v=x8VYWazR5NU',
      type: 'youtube',
      duration: '2h'
    }
  ],
  building: [
    {
      title: 'Epic Orchestral Music - Power',
      url: 'https://www.youtube.com/watch?v=VBlFHuCzPgY',
      type: 'youtube',
      duration: '3h'
    },
    {
      title: 'Epic Movie Soundtracks',
      url: 'https://www.youtube.com/watch?v=8Z8-d0ZknAo',
      type: 'youtube',
      duration: '2h'
    },
    {
      title: 'Heroic Orchestral Compilation',
      url: 'https://www.youtube.com/watch?v=c0m1D82Yt1s',
      type: 'youtube',
      duration: '2h'
    },
    {
      title: 'Epic Music Mix - Power & Energy',
      url: 'https://www.youtube.com/watch?v=VBlFHuCzPgY',
      type: 'youtube',
      duration: '3h'
    }
  ],
  test_passed: [
    {
      title: 'Victory Music - Celebration',
      url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
      type: 'youtube',
      duration: '30m'
    },
    {
      title: 'Epic Win Compilation',
      url: 'https://www.youtube.com/watch?v=p7ScGV5128A',
      type: 'youtube',
      duration: '1h'
    },
    {
      title: 'Success & Achievement Music',
      url: 'https://www.youtube.com/watch?v=ZXsQAXx_ao0',
      type: 'youtube',
      duration: '1h'
    }
  ],
  test_failed: [
    {
      title: 'Motivational Uplifting Music',
      url: 'https://www.youtube.com/watch?v=yJxCdh1Ps48',
      type: 'youtube',
      duration: '1h'
    },
    {
      title: 'Recovery & Healing Music',
      url: 'https://www.youtube.com/watch?v=ZXsQAXx_ao0',
      type: 'youtube',
      duration: '1h'
    },
    {
      title: 'Chill Lofi - Try Again',
      url: 'https://www.youtube.com/watch?v=rUxyKA_-grg',
      type: 'youtube',
      duration: '24h'
    }
  ]
};

export function getPlaylistForState(state: ActivityState): PlaylistEntry | undefined {
  const playlists = STATE_PLAYLISTS[state];
  if (!playlists || playlists.length === 0) {
    return STATE_PLAYLISTS.idle[0]; // Fallback to idle
  }
  return playlists[Math.floor(Math.random() * playlists.length)];
}

export function getAllPlaylistsForState(state: ActivityState): PlaylistEntry[] {
  return STATE_PLAYLISTS[state] || STATE_PLAYLISTS.idle;
}

export function validatePlaylistUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

export function openPlaylistInBrowser(url: string): boolean {
  if (!validatePlaylistUrl(url)) {
    console.error('Invalid playlist URL:', url);
    return false;
  }
  return true;
}