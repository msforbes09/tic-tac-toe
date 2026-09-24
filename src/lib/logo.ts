/**
 * The app logo: a big X top-left and a big O bottom-right that overlap, the X's lower-right arm
 * running across the O's ring and ending inside it. One geometry, in a 512-unit box, shared by
 * `public/icon.svg` (which repeats these numbers by hand; a test keeps them in step) and the
 * `Logo` component the splash draws.
 */
export const LOGO = {
  size: 512,
  stroke: 40,
  /** X centre and half arm length; arms run corner to corner of a square of side 2*arm. */
  x: { cx: 200, cy: 200, arm: 90 },
  /** O centre and ring radius (to the stroke's middle). */
  o: { cx: 330, cy: 330, r: 90 },
} as const
