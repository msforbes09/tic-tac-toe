import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Difficulty, Mode, Settings } from '@/lib/types'

export type SetupScreenProps = {
  onStart: (settings: Settings) => void
  onOpenHistory: () => void
}

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'Plays at random' },
  { value: 'medium', label: 'Medium', hint: 'Takes wins and blocks' },
  { value: 'hard', label: 'Hard', hint: 'Never loses' },
]

export function SetupScreen({ onStart, onOpenHistory }: SetupScreenProps) {
  const [mode, setMode] = useState<Mode>('pvp')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="pt-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Tic-Tac-Toe</h1>
        <p className="mt-1 text-muted-foreground">Three in a row wins.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Mode</CardTitle>
          <CardDescription>Who's playing?</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            value={[mode]}
            onValueChange={(v: string[]) => {
              const next = v[0]
              if (next) setMode(next as Mode)
            }}
            className="grid w-full grid-cols-2"
            aria-label="Game mode"
          >
            <ToggleGroupItem value="pvp" className="min-h-11" aria-label="Two player">
              Two player
            </ToggleGroupItem>
            <ToggleGroupItem value="bot" className="min-h-11" aria-label="Versus bot">
              Versus bot
            </ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      {mode === 'bot' && (
        <Card>
          <CardHeader>
            <CardTitle>Difficulty</CardTitle>
            <CardDescription>{DIFFICULTIES.find((d) => d.value === difficulty)?.hint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              value={[difficulty]}
              onValueChange={(v: string[]) => {
                const next = v[0]
                if (next) setDifficulty(next as Difficulty)
              }}
              className="grid w-full grid-cols-3"
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((d) => (
                <ToggleGroupItem key={d.value} value={d.value} className="min-h-11" aria-label={d.label}>
                  {d.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>
        </Card>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <Button size="lg" className="min-h-12 w-full" onClick={() => onStart({ mode, difficulty })}>
          Start game
        </Button>
        <Button variant="outline" size="lg" className="min-h-12 w-full" onClick={onOpenHistory}>
          History
        </Button>
      </div>
    </section>
  )
}
