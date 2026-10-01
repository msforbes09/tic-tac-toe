import { useCurrentFrame } from "remotion"
import { Column, heading, Shot } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { rise } from "../motion"
import { BEATS } from "../timeline"
import { COLOR } from "../tokens"

const line = { fill: "none", stroke: COLOR.foreground, strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" } as const

// Simple line icons: a home-screen tile, wifi with a slash, a price tag.
const ICONS = {
  install: (
    <>
      <rect x={18} y={18} width={64} height={64} rx={16} {...line} />
      <path d="M50 34 V62 M38 51 L50 63 L62 51" {...line} />
    </>
  ),
  offline: (
    <>
      <path d="M16 42 A48 48 0 0 1 84 42 M28 55 A31 31 0 0 1 72 55 M40 68 A14 14 0 0 1 60 68" {...line} />
      <path d="M20 20 L80 84" {...line} />
    </>
  ),
  free: (
    <>
      <path d="M50 16 H82 V48 L48 82 L16 50 Z" {...line} />
      <circle cx={67} cy={31} r={5} {...line} />
    </>
  ),
}

const PILLS = [
  { icon: ICONS.install, label: "Installs as an app" },
  { icon: ICONS.offline, label: "Works offline" },
  { icon: ICONS.free, label: "Free" },
]

// Shot 6: three pills, one per claim, each rising with its words; earlier pills stay.
export function Shot6Free({ layout, from, to }: { layout: Layout; from: number; to: number }) {
  const frame = useCurrentFrame()
  const size = TYPE[layout].chip
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).content} gap={size * 0.6}>
        {PILLS.map(({ icon, label }, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: size * 0.45,
              padding: `${size * 0.4}px ${size * 0.8}px ${size * 0.4}px ${size * 0.6}px`,
              background: COLOR.card,
              border: `2px solid ${COLOR.border}`,
              borderRadius: 999,
              ...rise(frame, from + BEATS.pills[i]),
            }}
          >
            <svg width={size * 1.1} height={size * 1.1} viewBox="0 0 100 100">
              {icon}
            </svg>
            <span style={heading(size)}>{label}</span>
          </div>
        ))}
      </Column>
    </Shot>
  )
}
