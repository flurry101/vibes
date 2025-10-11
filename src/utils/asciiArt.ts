import { VibeMode, ActivityState } from '../types';

// Animated ASCII frames for more dynamic feel
export const ASCII_ANIMATIONS = {
  encouraging: {
    idle: [
      `    😊\n   /|\\    \n    |     \n   / \\    \n "Ready!"  `,
      `    😊\n   \\|/    \n    |     \n   / \\    \n "Ready!"  `
    ],
    productive: [
      `    😊✨  \n   /|\\    \n    |     \n   / \\    \n "Go go!"  `,
      `   ✨😊   \n   /|\\    \n    |     \n   / \\    \n "Amazing!" `,
      `    😊✨  \n   /|\\    \n    |     \n   / \\    \n "Fire!"   `
    ],
    stuck: [
      `    😌    \n   /|\\    \n    |     \n   / \\    \n "Think..." `,
      `    🤔    \n   /|\\    \n    |     \n   / \\    \n "Hmm..."  `
    ],
    procrastinating: [
      `    😅    \n   /|\\    \n    |     \n   / \\    \n "Focus?"  `,
      `    😬    \n   /|\\    \n    |     \n   / \\    \n "Hello?"  `
    ],
    testing: [
      `    🤞    \n   /|\\    \n    |     \n   / \\    \n "Testing!" `,
      `    😬    \n   /|\\    \n    |     \n   / \\    \n "Please!" `
    ],
    building: [
      `    😴    \n   /|\\    \n    |     \n   / \\    \n "zzz..."  `,
      `    😴💤  \n   /|\\    \n    |     \n   / \\    \n "ZZZ..."  `
    ],
    test_passed: [
      `   🎉😊🎉 \n   \\|/    \n    |     \n   / \\    \n "YESSS!"  `,
      `   ✨😊✨ \n   \\|/    \n    |     \n   / \\    \n "WOOO!"   `,
      `   🎊😊🎊 \n   \\|/    \n    |     \n   / \\    \n "YES!"    `
    ],
    test_failed: [
      `    😢    \n   /|\\    \n    |     \n   / \\    \n "Aww..."  `,
      `    😔    \n   /|\\    \n    |     \n   / \\    \n "Next!"   `
    ]
  },
  roasting: {
    idle: [
      `    😏    \n   /|\\    \n    |     \n   / \\    \n "nap?"    `,
      `    🙄    \n   /|\\    \n    |     \n   / \\    \n "hello?"  `
    ],
    productive: [
      `    🤨    \n   /|\\    \n    |     \n   / \\    \n "finally" `,
      `    😏    \n   /|\\    \n    |     \n   / \\    \n "decent"  `
    ],
    stuck: [
      `    😏    \n   /|\\    \n    |     \n   / \\    \n "skill    \n  issue"   `,
      `    🙄    \n   /|\\    \n    |     \n   / \\    \n "bruh"    `
    ],
    procrastinating: [
      `    🙄    \n   /|\\    \n    |     \n   / \\    \n "youtube?"\n          `,
      `    😒    \n   /|\\    \n    |     \n   / \\    \n "reddit?" `
    ],
    testing: [
      `    😬    \n   /|\\    \n    |     \n   / \\    \n "watch"   \n "this"    \n "fail"    `,
      `    😏    \n   /|\\    \n    |     \n   / \\    \n "lol"     `
    ],
    building: [
      `    😴    \n   /|\\    \n    |     \n   / \\    \n "*snore*" `,
      `    😴💤  \n   /|\\    \n    |     \n   / \\    \n "zzzz"    `
    ],
    test_passed: [
      `    😲    \n   /|\\    \n    |     \n   / \\    \n "wtf it"  \n "worked"  `,
      `    🤯    \n   /|\\    \n    |     \n   / \\    \n "lucky"   `
    ],
    test_failed: [
      `    💀    \n   /|\\    \n    |     \n   / \\    \n "called"  \n "it lmao" `,
      `    😏    \n   /|\\    \n    |     \n   / \\    \n "told ya" `
    ]
  },
  neutral: {
    idle: [
      `    🤖    \n   /|\\    \n    |     \n   / \\    \n [idle]    `
    ],
    productive: [
      `    🤖    \n   /|\\    \n    |     \n   / \\    \n [active]  `,
      `    🤖⚡  \n   /|\\    \n    |     \n   / \\    \n [active]  `
    ],
    stuck: [
      `    🤖    \n   /|\\    \n    |     \n   / \\    \n[analyzing]`
    ],
    procrastinating: [
      `    🤖    \n   /|\\    \n    |     \n   / \\    \n[distracted]`
    ],
    testing: [
      `    🤖    \n   /|\\    \n    |     \n   / \\    \n [testing] `
    ],
    building: [
      `    🤖    \n   /|\\    \n    |     \n   / \\    \n[compiling]`
    ],
    test_passed: [
      `    🤖✓   \n   /|\\    \n    |     \n   / \\    \n [passed]  `
    ],
    test_failed: [
      `    🤖✗   \n   /|\\    \n    |     \n   / \\    \n [failed]  `
    ]
  }
};

export function getASCIIFrame(vibe: VibeMode, state: ActivityState, frameIndex: number = 0): string {
  const frames = ASCII_ANIMATIONS[vibe][state] || ASCII_ANIMATIONS[vibe].idle;
  return frames[frameIndex % frames.length];
}

export function getASCIIFrameCount(vibe: VibeMode, state: ActivityState): number {
  const frames = ASCII_ANIMATIONS[vibe][state] || ASCII_ANIMATIONS[vibe].idle;
  return frames.length;
}