import { useCurrentFrame } from "remotion"
import { Mark } from "../components/Mark"
import { Phone } from "../components/Phone"
import { Column, heading, Shot, text } from "../components/Shot"
import { type Layout, TYPE, zones } from "../layout"
import { enter, pop, rise } from "../motion"
import { BEATS, type Player, ROOM_CODE } from "../timeline"
import { COLOR } from "../tokens"

const HEADLINE_AT = 4
const LABEL_AT = 8
const SECOND_PHONE_AT = 40
const PHONE_MARKS_AT = 50

type Card = { layout: Layout; from: number; to: number }

// Shot 4: three ways to play, three cards in a row: Online, One phone, The bot.
export function Shot4Modes({ layout, starts, to }: { layout: Layout; starts: [number, number, number]; to: number }) {
  const [online, onePhone, bot] = starts
  return (
    <>
      <Online layout={layout} from={online} to={onePhone} />
      <OnePhone layout={layout} from={onePhone} to={bot} />
      <TheBot layout={layout} from={bot} to={to} />
    </>
  )
}

function ModeCard({ layout, from, to, title, label, children }: Card & { title: string; label: string; children: React.ReactNode }) {
  const frame = useCurrentFrame()
  const type = TYPE[layout]
  return (
    <Shot from={from} to={to}>
      <Column box={zones(layout).content} gap={type.modeLabel * 0.4}>
        <div style={{ ...heading(type.modeHeadline), ...rise(frame, from + HEADLINE_AT) }}>{title}</div>
        <div style={{ ...text(type.modeLabel), ...rise(frame, from + LABEL_AT) }}>{label}</div>
        <div style={{ marginTop: type.modeLabel, display: "flex", flexDirection: "column", alignItems: "center", gap: type.modeLabel * 0.8 }}>
          {children}
        </div>
      </Column>
    </Shot>
  )
}

function Tile({ size, player, at }: { size: number; player: Player; at: number }) {
  const frame = useCurrentFrame()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.14,
        background: COLOR.tile,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...pop(frame, at),
      }}
    >
      <Mark player={player} at={at} size={size} />
    </div>
  )
}

function Online(card: Card) {
  const frame = useCurrentFrame()
  const reel = card.layout === "reel"
  const tile = reel ? 150 : 104
  const phone = reel ? 250 : 170
  const mark = phone * 0.3
  const slide = enter(frame, card.from + SECOND_PHONE_AT)
  const phoneMarks = (
    <>
      <Mark player="X" at={card.from + PHONE_MARKS_AT} size={mark} />
      <Mark player="O" at={card.from + PHONE_MARKS_AT + 6} size={mark} />
    </>
  )
  return (
    <ModeCard {...card} title="Online" label="Room code">
      <div style={{ display: "flex", gap: tile * 0.14 }}>
        {[...ROOM_CODE].map((c, i) => (
          <Tile key={i} size={tile} player={c as Player} at={card.from + BEATS.codeTiles + i * BEATS.codeStagger} />
        ))}
      </div>
      <div style={{ display: "flex", gap: phone * 0.2, ...rise(frame, card.from + LABEL_AT) }}>
        <Phone height={phone}>{phoneMarks}</Phone>
        <div style={{ opacity: slide, transform: `translateX(${(1 - slide) * 40}px)` }}>
          <Phone height={phone}>{phoneMarks}</Phone>
        </div>
      </div>
    </ModeCard>
  )
}

function OnePhone(card: Card) {
  const frame = useCurrentFrame()
  const phone = card.layout === "reel" ? 430 : 300
  return (
    <ModeCard {...card} title="One phone" label="Pass it back and forth">
      <div style={rise(frame, card.from + LABEL_AT)}>
        <Phone height={phone}>
          <Mark player="X" at={card.from + BEATS.phoneX} size={phone * 0.32} />
          <Mark player="O" at={card.from + BEATS.phoneO} size={phone * 0.32} />
        </Phone>
      </div>
    </ModeCard>
  )
}

const LEVELS = ["Easy", "Medium", "Hard"]
const PILLS_AT = 10
const PILL_STAGGER = 5
const STEP_OPACITY = [0.5, 0.75, 1]

function TheBot(card: Card) {
  const frame = useCurrentFrame()
  const type = TYPE[card.layout]
  const pillW = card.layout === "reel" ? 250 : 190
  const gap = pillW * 0.08
  const badge = pillW * 0.5
  const [first, ...rest] = BEATS.botSteps.map((s) => card.from + s)
  // The O badge lands on Easy, then steps pill to pill (one step per 0.8 s), brighter each time.
  const position = rest.reduce((sum, stepAt) => sum + enter(frame, stepAt), 0)
  const stepIndex = rest.filter((stepAt) => frame >= stepAt).length
  const badgePop = pop(frame, first)
  return (
    <ModeCard {...card} title="The bot" label="Three levels">
      <div style={{ position: "relative", width: 3 * pillW + 2 * gap, height: badge + type.modeLabel * 0.4 }}>
        <svg
          width={badge}
          height={badge}
          viewBox="0 0 100 100"
          style={{
            position: "absolute",
            left: (pillW - badge) / 2 + position * (pillW + gap),
            top: 0,
            transform: badgePop.transform,
            opacity: Number(badgePop.opacity) * STEP_OPACITY[stepIndex],
          }}
        >
          <circle cx={50} cy={50} r={46} fill={COLOR.tile} />
          <circle cx={50} cy={50} r={24} fill="none" stroke={COLOR.o} strokeWidth={11} />
        </svg>
      </div>
      <div style={{ display: "flex", gap }}>
        {LEVELS.map((level, i) => (
          <div
            key={level}
            style={{
              width: pillW,
              padding: `${type.modeLabel * 0.4}px 0`,
              textAlign: "center",
              background: COLOR.card,
              border: `2px solid ${COLOR.border}`,
              borderRadius: 999,
              ...heading(type.modeLabel),
              ...pop(frame, card.from + PILLS_AT + i * PILL_STAGGER),
            }}
          >
            {level}
          </div>
        ))}
      </div>
    </ModeCard>
  )
}
