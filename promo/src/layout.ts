// Canvas, safe areas, layout anchors and type sizes per format (storyboard section 2).

export const LAYOUTS = ['reel', 'square'] as const
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
// TOAST_DROP px above its zone; the logo settles LOGO_SETTLE px down over the last hold.
export const SLIDE = 12
export const TOAST_DROP = 10
export const LOGO_SETTLE = 4

type Zones = { board: Box; title: Box; bubble: Box; content: Box; logo: Box }

const ZONES: Record<Layout, Zones> = {
  reel: {
    board: { x: 120, y: 560, w: 840, h: 840 },
    title: { x: 72, y: 290, w: 936, h: 190 },
    bubble: { x: 90, y: 290, w: 900, h: 180 },
    content: { x: 72, y: 460, w: 936, h: 840 },
    // Logo (440) + gap (36) + wordmark line (120), centred on y 860.
    logo: { x: 72, y: 562, w: 936, h: 596 },
  },
  square: {
    board: { x: 230, y: 330, w: 620, h: 620 },
    title: { x: 72, y: 60, w: 936, h: 190 },
    bubble: { x: 90, y: 70, w: 900, h: 180 },
    content: { x: 72, y: 150, w: 936, h: 780 },
    // Logo (300) + gap (28) + wordmark line (92), centred on y 540.
    logo: { x: 72, y: 330, w: 936, h: 420 },
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
  },
} satisfies Record<Layout, Record<string, number>>
