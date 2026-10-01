// Canvas, safe areas, layout anchors and type sizes per format (storyboard section 2).

export const LAYOUTS = ["reel", "square"] as const
export type Layout = (typeof LAYOUTS)[number]

export type Box = { x: number; y: number; w: number; h: number }

export const CANVAS: Record<Layout, { width: number; height: number }> = {
  reel: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
}

export const SAFE: Record<Layout, Box> = {
  reel: { x: 72, y: 250, w: 936, h: 1270 },
  square: { x: 60, y: 60, w: 960, h: 960 },
}

// Motion limits: content rises in from SLIDE px below and leaves SLIDE px down; the toast drops in from
// TOAST_DROP px above its zone; the shot 8 stack settles MARK_SETTLE px down over the last 3 s.
export const SLIDE = 12
export const TOAST_DROP = 10
export const MARK_SETTLE = 4
// The splash's own motion (Splash.tsx, index.css): title and slogan rise 10 px; splash-out scales to 1.03.
export const SPLASH_RISE = 10
export const SPLASH_OUT_SCALE = 1.03

type Zones = {
  splash: Box
  splashLogo: number
  splashGaps: [number, number] // logo to title, title to slogan
  footer: Box
  board: Box
  subline: Box
  bubble: Box
  thinking: Box
  content: Box
  kaya: { mark: Box; wordmark: Box; url: Box }
}

const ZONES: Record<Layout, Zones> = {
  reel: {
    // Logo (690) + gap (86) + title line (134.4) + gap (25) + slogan line (57.6), centred on y 808.
    splash: { x: 120, y: 311.5, w: 840, h: 993 },
    splashLogo: 690,
    splashGaps: [86, 25],
    footer: { x: 240, y: 1451, w: 600, h: 38 },
    board: { x: 120, y: 560, w: 840, h: 840 },
    subline: { x: 72, y: 290, w: 936, h: 190 },
    bubble: { x: 90, y: 290, w: 900, h: 180 },
    thinking: { x: 480, y: 320, w: 120, h: 120 },
    content: { x: 72, y: 460, w: 936, h: 840 },
    // Amendment 1 section 3: the mark's ink (y 513-949), wordmark and URL centred as one stack on y 860.
    kaya: {
      mark: { x: 170, y: 371, w: 720, h: 720 },
      wordmark: { x: 72, y: 1013, w: 936, h: 120 },
      url: { x: 72, y: 1153, w: 936, h: 53 },
    },
  },
  square: {
    // Logo (517) + gap (65) + title line (100.8) + gap (18) + slogan line (43.2), centred on y 497.
    splash: { x: 230, y: 125, w: 620, h: 744 },
    splashLogo: 517,
    splashGaps: [65, 18],
    footer: { x: 290, y: 958, w: 500, h: 34 },
    board: { x: 230, y: 330, w: 620, h: 620 },
    subline: { x: 72, y: 60, w: 936, h: 190 },
    bubble: { x: 90, y: 70, w: 900, h: 180 },
    thinking: { x: 496, y: 116, w: 88, h: 88 },
    content: { x: 72, y: 150, w: 936, h: 780 },
    // Amendment 1 section 3: the mark's ink (y 249-637), wordmark and URL centred as one stack on y 540.
    kaya: {
      mark: { x: 211, y: 123, w: 640, h: 640 },
      wordmark: { x: 72, y: 685, w: 936, h: 92 },
      url: { x: 72, y: 791, w: 936, h: 41 },
    },
  },
}

export const zones = (layout: Layout): Zones => ZONES[layout]

export const TYPE = {
  reel: {
    title: 128,
    subline: 48,
    bubble: 68,
    toastLabel: 28,
    toastName: 56,
    toastDescription: 34,
    modeHeadline: 112,
    modeLabel: 48,
    numeral: 400,
    numeralLabel: 60,
    chip: 64,
    slogan: 124,
    wordmark: 100,
    url: 44,
    footer: 32,
  },
  square: {
    title: 96,
    subline: 36,
    bubble: 52,
    toastLabel: 28,
    toastName: 44,
    toastDescription: 30,
    modeHeadline: 84,
    modeLabel: 36,
    numeral: 280,
    numeralLabel: 44,
    chip: 48,
    slogan: 92,
    wordmark: 76,
    url: 34,
    footer: 28,
  },
} satisfies Record<Layout, Record<string, number>>
