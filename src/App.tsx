import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { GameScreen } from '@/components/GameScreen'
import { HistorySheet } from '@/components/HistorySheet'
import { SetupScreen } from '@/components/SetupScreen'
import type { HistoryStorage } from '@/lib/history'
import { loadSetup, saveSetup } from '@/lib/setup'
import { createBrowserFeedback } from '@/platform/browserFeedback'
import type { Settings } from '@/lib/types'

const noopStorage: HistoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

function browserStorage(): HistoryStorage {
  try {
    const s = window.localStorage
    s.getItem('tic-tac-toe:probe')
    return s
  } catch {
    return noopStorage
  }
}

const storage = browserStorage()
const feedback = createBrowserFeedback()

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <AppShell>
      {settings ? (
        <GameScreen settings={settings} storage={storage} feedback={feedback} onBack={() => setSettings(null)} />
      ) : (
        <SetupScreen
          initial={loadSetup(storage)}
          onStart={(next) => {
            saveSetup(storage, next)
            setSettings(next)
          }}
          onOpenHistory={() => setHistoryOpen(true)}
        />
      )}
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} storage={storage} />
    </AppShell>
  )
}
