import { useEffect, useState } from "react"
import { AchievementIcon } from "./AchievementBadge"
import { Button } from "@/components/ui/button"
import { FloatingBack } from "./FloatingBack"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ACHIEVEMENTS, achievementById, type AchievementId, type Unlocks } from "@/lib/achievements"
import type { Tone } from "@/lib/banter"
import { NICKNAME_MAX, normalizeNickname, sanitizeNicknameInput } from "@/lib/identity"
import { TOP_RUNG } from "@/lib/ladder"
import { cn } from "@/lib/utils"

export type SettingsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The chosen nickname, or null before one was ever picked. */
  nickname: string | null
  /** Prefilled when there is no nickname yet, and used when the edit is not a valid nickname. */
  suggestedNickname: string
  onSaveNickname: (name: string) => void
  tone: Tone
  onToneChange: (tone: Tone) => void
  /** The badge worn above the nickname online, picked from the unlocked achievements. */
  badge?: BadgeSection
  /** Until the app is installed: a one-tap Install where the browser offers one, the Share steps on iPhone. */
  install?: InstallSection
  /** Developer mode only: the Developer section. Every action there closes the sheet. */
  dev?: DevSection
}

export type BadgeSection = {
  unlocks: Unlocks
  worn: AchievementId | null
  onChange: (badge: AchievementId | null) => void
}
export type InstallSection = { kind: "prompt" | "ios-steps"; onInstall: () => void }

export type DevSection = {
  rung: number | null
  onSetRung: (rung: number) => void
  onReset: () => void
  onShowPlayers: () => void
  onExit: () => void
}

export function SettingsSheet({
  open,
  onOpenChange,
  nickname,
  suggestedNickname,
  onSaveNickname,
  tone,
  onToneChange,
  badge,
  install,
  dev,
}: SettingsSheetProps) {
  /** Settings, from the gear on the setup screen: the nickname, the bot's attitude, installing, and developer tools. */
  const initial = nickname ?? suggestedNickname
  const [value, setValue] = useState(initial)
  const [rung, setRung] = useState(String(dev?.rung ?? 1))
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    if (!open) return
    setValue(initial)
    setRung(String(dev?.rung ?? 1))
    setConfirmReset(false)
  }, [open, initial, dev?.rung])
  const aggressive = tone === "cocky"
  const parsedRung = Number(rung)
  const validRung = Number.isInteger(parsedRung) && parsedRung >= 1 && parsedRung <= TOP_RUNG

  const save = () => onSaveNickname(normalizeNickname(value) ?? initial)
  const close = () => onOpenChange(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        // A tap moves no focus, so the nickname field does not pop the keyboard; keyboard users keep the default.
        initialFocus={(openType) => openType === "keyboard"}
        className="mx-auto flex w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        // Capped so the top stays on screen on short phones (developer mode adds a tall section); the
        // content scrolls inside while Back stays put in the bottom padding.
        style={{ maxHeight: "90dvh", paddingBottom: "max(4.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="-mx-5 flex min-h-0 flex-col gap-6 overflow-y-auto px-5">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="font-heading text-2xl font-semibold">Settings</SheetTitle>
            <SheetDescription>Make the game yours.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2">
            <label htmlFor="settings-nickname" className="font-heading text-[15px] font-medium">
              Nickname
            </label>
            <div className="flex gap-2">
              <input
                id="settings-nickname"
                value={value}
                onChange={(e) => setValue(sanitizeNicknameInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save()
                }}
                maxLength={NICKNAME_MAX}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="border-input bg-background focus-visible:ring-ring min-h-12 min-w-0 flex-1 rounded-[16px] border px-4 text-base font-semibold outline-none focus-visible:ring-2"
              />
              <Button
                className="min-h-12 rounded-[16px] px-5 text-[15px] font-medium"
                onClick={save}
              >
                Save
              </Button>
            </div>
            <p className="text-muted-foreground text-sm">Letters, digits and spaces, up to 12.</p>
          </div>

          <div className="bg-muted/70 dark:bg-muted/50 flex items-center justify-between gap-4 rounded-[18px] px-4 py-3">
            <div className="flex flex-col">
              <span id="settings-aggressive" className="font-heading text-[15px] font-medium">
                Aggressive bot
              </span>
              <span className="text-muted-foreground text-sm">Trash talk instead of cheers.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={aggressive}
              aria-labelledby="settings-aggressive"
              onClick={() => onToneChange(aggressive ? "friendly" : "cocky")}
              className={cn(
                "box-border flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-150",
                aggressive ? "bg-player-o justify-end" : "bg-input justify-start",
              )}
            >
              <span aria-hidden="true" className="bg-background size-6 shrink-0 rounded-full" />
            </button>
          </div>

          {badge && <BadgePicker {...badge} />}
          {install && (
            <div className="bg-muted/70 dark:bg-muted/50 flex items-center justify-between gap-4 rounded-[18px] px-4 py-3">
              <div className="flex flex-col">
                <span className="font-heading text-[15px] font-medium">Add to Home Screen</span>
                <span className="text-muted-foreground text-sm">
                  {install.kind === "prompt"
                    ? "Opens full screen like an app and works offline."
                    : "Tap Share, then Add to Home Screen."}
                </span>
              </div>
              {install.kind === "prompt" && (
                <Button
                  className="min-h-11 shrink-0 rounded-[14px] px-4 text-[15px] font-medium"
                  onClick={install.onInstall}
                >
                  Install
                </Button>
              )}
            </div>
          )}

          {dev && (
            <div className="border-border flex flex-col gap-3 rounded-[18px] border border-dashed px-4 py-3">
              <span className="font-heading text-[15px] font-medium">Developer</span>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Rung</span>
                <span className="flex items-center gap-2">
                  <input
                    aria-label="Rung"
                    type="number"
                    min={1}
                    max={TOP_RUNG}
                    value={rung}
                    onChange={(e) => setRung(e.target.value)}
                    className="border-input bg-background focus-visible:ring-ring min-h-10 w-20 rounded-xl border px-3 text-center tabular-nums outline-none focus-visible:ring-2"
                  />
                  <Button
                    className="min-h-10 rounded-xl"
                    disabled={!validRung}
                    onClick={() => {
                      dev.onSetRung(parsedRung)
                      close()
                    }}
                  >
                    Set
                  </Button>
                </span>
              </label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 flex-1 rounded-[14px]"
                  onClick={() => {
                    if (!confirmReset) setConfirmReset(true)
                    else {
                      dev.onReset()
                      setConfirmReset(false)
                      close()
                    }
                  }}
                >
                  {confirmReset ? "Tap again to confirm" : "Reset game data"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="min-h-11 flex-1 rounded-[14px]"
                  onClick={() => {
                    dev.onShowPlayers()
                    close()
                  }}
                >
                  Players
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11 rounded-[14px] px-4"
                  onClick={() => {
                    dev.onExit()
                    close()
                  }}
                >
                  Exit developer mode
                </Button>
              </div>
            </div>
          )}
        </div>
        <FloatingBack />
      </SheetContent>
    </Sheet>
  )
}

/** A row of the unlocked achievements plus None; the worn one is outlined. */
function BadgePicker({ unlocks, worn, onChange }: BadgeSection) {
  const unlocked = ACHIEVEMENTS.filter((a) => unlocks[a.id] !== undefined)
  const tile = (on: boolean) =>
    cn(
      "flex size-12 shrink-0 items-center justify-center rounded-[14px] border",
      on ? "border-player-o bg-player-o-soft" : "border-input",
    )
  return (
    <div className="flex flex-col gap-2">
      <span id="settings-badge" className="font-heading text-[15px] font-medium">
        Badge
      </span>
      <span className="text-muted-foreground text-sm">Shown above your name online.</span>
      {unlocked.length === 0 ? (
        <p className="text-muted-foreground text-sm">Unlock an achievement to wear a badge</p>
      ) : (
        <div
          role="radiogroup"
          aria-labelledby="settings-badge"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={worn === null}
            aria-label="None"
            onClick={() => onChange(null)}
            className={cn(tile(worn === null), "text-muted-foreground")}
          >
            –
          </button>
          {unlocked.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={worn === a.id}
              aria-label={achievementById(a.id).name}
              onClick={() => onChange(a.id)}
              className={tile(worn === a.id)}
            >
              <AchievementIcon id={a.id} className="size-6" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
