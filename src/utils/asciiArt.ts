import { VibeMode, ActivityState } from '../types.js';

type AnimationFrames = Record<ActivityState, string[]>;
type AllAnimations = Record<VibeMode, AnimationFrames>;

const ASCII_ANIMATIONS: AllAnimations = {
  encouraging: {
    idle: [
      '😊',
      '🤗',
      '💪'
    ],
    productive: [
      '🔥',
      '⚡',
      '🚀',
      '💯'
    ],
    stuck: [
      '🤔',
      '💭',
      '🌟'
    ],
    procrastinating: [
      '👀',
      '⏰',
      '💪'
    ],
    testing: [
      '🤞',
      '🙏',
      '✨'
    ],
    building: [
      '🏗️',
      '⚙️',
      '🔧'
    ],
    test_passed: [
      '🎉',
      '🥳',
      '✅',
      '🏆'
    ],
    test_failed: [
      '💙',
      '🤗',
      '💪',
      '🌈'
    ]
  },
  roasting: {
    idle: [
      '👀',
      '😴',
      '🥱'
    ],
    productive: [
      '😏',
      '👍',
      '🙄'
    ],
    stuck: [
      '🤡',
      '💀',
      '🤦'
    ],
    procrastinating: [
      '📱',
      '☕',
      '😴'
    ],
    testing: [
      '💀',
      '😬',
      '🙃'
    ],
    building: [
      '🔨',
      '💥',
      '😅'
    ],
    test_passed: [
      '😏',
      '💀',
      '🎯'
    ],
    test_failed: [
      '🤡',
      '💩',
      '🔥',
      '💀'
    ]
  },
  neutral: {
    idle: [
      '🤖',
      '⏸️'
    ],
    productive: [
      '⚙️',
      '💻',
      '📊'
    ],
    stuck: [
      '🔍',
      '🧩',
      '🔧'
    ],
    procrastinating: [
      '⏳',
      '⏰'
    ],
    testing: [
      '🧪',
      '📋',
      '⚗️'
    ],
    building: [
      '🏗️',
      '⚙️',
      '🔩'
    ],
    test_passed: [
      '✅',
      '📗',
      '✔️'
    ],
    test_failed: [
      '❌',
      '📕',
      '🔴'
    ]
  }
};

export function getAnimationFrame(vibe: VibeMode, state: ActivityState, frameIndex: number): string {
  const frames = ASCII_ANIMATIONS[vibe][state] || ASCII_ANIMATIONS[vibe].idle;
  return frames[frameIndex % frames.length];
}

export function getAnimationLength(vibe: VibeMode, state: ActivityState): number {
  const frames = ASCII_ANIMATIONS[vibe][state] || ASCII_ANIMATIONS[vibe].idle;
  return frames.length;
}

export { ASCII_ANIMATIONS };