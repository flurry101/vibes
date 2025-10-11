export type VibeMode = 'encouraging' | 'roasting' | 'neutral';

export type MusicMode = 'automatic' | 'playlist';

export type ActivityState = 
  | 'idle' 
  | 'productive' 
  | 'stuck' 
  | 'procrastinating'
  | 'testing' 
  | 'building'
  | 'test_passed'
  | 'test_failed';

export type MusicData = {
  command: string;
  vibe?: VibeMode;  
  state?: ActivityState; 
  text?: string;  
};

export type ActivityMetrics = {
  typingCount: number;
  idleTime: number;
  lastActivity: number;
};

export type MusicParams = {
  tempo?: number;
  volume?: number;
  intensity?: number;
};

export type MusicSource = {
  title: string;
  url: string;
  state: ActivityState;
  vibe: VibeMode;
};