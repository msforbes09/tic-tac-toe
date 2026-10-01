// Colours, fonts and easing from storyboard section 0 and 2 (the hex values of the app's dark tokens).
import { Easing } from "remotion"

export const COLOR = {
  background: "#0a0a0a",
  tray: "#1c1c1c",
  tile: "#262626",
  card: "#171717",
  border: "rgba(255, 255, 255, 0.1)",
  foreground: "#fafafa",
  muted: "#a1a1a1",
  x: "#8fa8ff",
  o: "#ff9f7a",
  bronze: "#cd7f32",
  silver: "#b8c0c8",
  gold: "#f2c14e",
  platinum: "#9fe3ff",
}

export const FONT = {
  heading: '"Fredoka Variable"',
  text: '"Nunito Variable"',
}

// Every enter uses the app's easing; exits are 8 frames on an ease-in.
export const ENTER = Easing.bezier(0.22, 1, 0.36, 1)
export const EXIT = Easing.bezier(0.4, 0, 1, 1)
export const EXIT_FRAMES = 8
