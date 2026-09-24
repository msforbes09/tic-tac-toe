import { Mark } from './Mark'
import type { Mode, Player } from '@/lib/types'
import type { Score } from '@/state/reducer'
import { cn } from '@/lib/utils'

export type ScoreBarProps = {
  mode: Mode
  score: Score
  /** The symbol player one holds this game, shown beside each seat's name. */
  p1Symbol: Player
}

function Seat({ label, value, symbol }: { label: string; value: number; symbol?: Player }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <dt className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
        {symbol && (
          <Mark
            player={symbol}
            weight={16}
            className={cn('size-3', symbol === 'X' ? 'text-player-x' : 'text-player-o')}
          />
        )}
        {label}
      </dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/** Wins and draws since leaving setup. */
export function ScoreBar({ mode, score, p1Symbol }: ScoreBarProps) {
  const p2Symbol: Player = p1Symbol === 'X' ? 'O' : 'X'
  const [one, two] = mode === 'bot' ? ['You', 'Bot'] : ['Player 1', 'Player 2']
  return (
    <dl aria-label="Session score" className="grid grid-cols-3 rounded-[18px] bg-muted/70 px-2 py-2.5 dark:bg-muted/50">
      <Seat label={one} value={score.p1} symbol={p1Symbol} />
      <Seat label="Draws" value={score.draws} />
      <Seat label={two} value={score.p2} symbol={p2Symbol} />
    </dl>
  )
}
