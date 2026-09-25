import { useId } from 'react'
import { TOP_RUNG } from '@/lib/ladder'
import { CLIMB_LENGTH } from '@/lib/climb'
import { cn } from '@/lib/utils'

const W = 300
const H = 96
const PAD = 6
const LANES: { label: string; className: string }[] = [
  { label: 'Hard', className: 'fill-player-x' },
  { label: 'Medium', className: 'fill-player-o' },
  { label: 'Easy', className: 'fill-foreground' },
]

/**
 * The climb: a sparkline of the rung over recent bot games, with the three bands as shaded lanes.
 * Rung numbers are never printed; the lanes tell the story.
 */
export function ClimbGraph({ rungs, className }: { rungs: number[]; className?: string }) {
  const descId = useId()
  const laneH = (H - PAD * 2) / LANES.length
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, rungs.length - 1)
  const y = (rung: number) => H - PAD - ((rung - 1) * (H - PAD * 2)) / (TOP_RUNG - 1)
  const points = rungs.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(' ')
  const last = rungs[rungs.length - 1]

  return (
    <div className={cn('flex flex-col gap-2 rounded-[18px] bg-muted/70 px-4 py-3 dark:bg-muted/50', className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-heading text-[15px] font-medium">Your climb</span>
        <span className="text-sm text-muted-foreground">
          {rungs.length >= CLIMB_LENGTH ? `last ${CLIMB_LENGTH} games` : `${rungs.length} games`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Your climb"
        aria-describedby={descId}
      >
        <desc id={descId}>{`Rungs ${rungs.join(', ')}`}</desc>
        {LANES.map((lane, i) => (
          <g key={lane.label}>
            <rect x={0} y={PAD + i * laneH} width={W} height={laneH} rx={4} className={lane.className} opacity={0.08} />
            <text x={6} y={PAD + i * laneH + 11} fontSize={9} className="fill-muted-foreground">
              {lane.label}
            </text>
          </g>
        ))}
        <polyline
          points={points}
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-player-o"
        />
        <circle cx={x(rungs.length - 1)} cy={y(last)} r={4} className="fill-player-o" />
      </svg>
    </div>
  )
}
