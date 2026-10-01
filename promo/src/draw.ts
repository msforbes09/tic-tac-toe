// How long a mark takes to draw, in frames (storyboard section 2): each X arm 8, one after the other; an O 10.
// Shared by the board's marks and the timeline that times sounds to them.
export const DRAW = { arm: 8, o: 10 }

// The logo draws at the app's own pace (Logo.tsx): the O over 14 frames (480 ms), the X from frame 16
// (520 ms), each arm 8 frames (260 ms), so the X is complete at frame 32.
export const LOGO_DRAW = { o: 14, x: 16, arm: 8 }

// The Kaya mark on shot 8 (storyboard-v2 amendment 1): stem, arm, leg, each 12 frames, each starting 4
// frames before the previous one ends; the first 2 frames into the shot, all done at frame 30.
export const KAYA_DRAW = { at: 2, stroke: 12, overlap: 4 }
