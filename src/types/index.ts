export type VibeMode = 'encouraging' | 'roasting' | 'neutral';

export type ActivityState = 
  | 'idle'
  | 'productive'
  | 'stuck'
  | 'procrastinating'
  | 'testing'
  | 'building'
  | 'test_passed'
  | 'test_failed';

export interface ActivityMetrics {
  typingSpeed: number;
  idleTime: number;
  tabSwitches: number;
  fileChanges: number;
  timeInFile: number;
}

export interface MusicParams {
  tempo: number;
  notes: string[];
  duration: string;
  pattern: 'chord' | 'ascending' | 'descending' | 'arpeggio';
  volume: number;
  mood: string;
}

export interface MusicSource {
  type: 'youtube' | 'spotify' | 'ai' | 'strudel';
  url?: string;
  params?: MusicParams;
  strudelCode?: string;
}

export interface CompanionState {
  vibe: VibeMode;
  activityState: ActivityState;
  message: string;
  ascii: string;
  musicSource: MusicSource;
  metrics: ActivityMetrics;
}