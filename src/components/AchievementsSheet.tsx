import { Lock, RotateCcw, SlidersHorizontal, Trophy } from "lucide-react"
import { useState, type ReactNode } from "react"
import { AchievementIcon } from "./AchievementBadge"
import { FloatingBack } from "./FloatingBack"
import { segmentItem, segmentTrack } from "./segment"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  ACHIEVEMENTS,
  DEFAULT_VIEW,
  completion,
  TIER_COLOR,
  TIER_ORDER,
  listAchievements,
  type Achievement,
  type AchievementId,
  type AchievementState,
  type ListView,
  type ShowFilter,
  type SortOrder,
  type Tier,
} from "@/lib/achievements"
import { cn } from "@/lib/utils"

export type AchievementsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: AchievementState
}

const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
const TIER_LABEL: Record<Tier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
}
const TIERS_DOWN = [...TIER_ORDER].reverse()
const SORTS: { value: SortOrder; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "oldest", label: "Oldest" },
  { value: "tier", label: "Tier" },
]
const SHOWS: { value: ShowFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "earned", label: "Earned" },
  { value: "locked", label: "Locked" },
]

const isDefault = (v: ListView) =>
  v.sort === DEFAULT_VIEW.sort && v.show === DEFAULT_VIEW.show && v.tier === DEFAULT_VIEW.tier

/** The trophy case: a summary strip, then every achievement as a row, sorted and filtered from a popup. */
export function AchievementsSheet(props: AchievementsSheetProps) {
  // Each opening is a new session: reveals and the view start fresh.
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(props.open)
  if (props.open !== wasOpen) {
    setWasOpen(props.open)
    if (props.open) setSession((n) => n + 1)
  }
  return <Session key={session} {...props} />
}

function Session({ open, onOpenChange, state }: AchievementsSheetProps) {
  const [view, setView] = useState<ListView>(DEFAULT_VIEW)
  const [popup, setPopup] = useState(false)
  const [revealed, setRevealed] = useState<Set<AchievementId>>(() => new Set())
  const reveal = (id: AchievementId) => setRevealed((prev) => new Set(prev).add(id))

  const unlocked = ACHIEVEMENTS.filter((a) => state.unlocks[a.id] !== undefined).length
  const { percent } = completion(state.unlocks)
  const shown = listAchievements(state.unlocks, view)

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        initialFocus={(openType) => openType === "keyboard"}
        className="mx-auto flex w-full max-w-[420px] flex-col rounded-t-[28px] px-5 pt-5"
        style={{ height: "85dvh", paddingBottom: "max(4.5rem, env(safe-area-inset-bottom))" }}
      >
      <SheetHeader className="flex-row items-center justify-between p-0 text-left">
        <div className="flex flex-col gap-1">
          <SheetTitle className="font-heading text-2xl font-semibold">Achievements</SheetTitle>
          <SheetDescription>
            {unlocked} of {ACHIEVEMENTS.length} unlocked
          </SheetDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sort and filter"
          data-active={!isDefault(view)}
          onClick={() => setPopup(true)}
          className="bg-muted/70 text-foreground dark:bg-muted/50 relative size-11 rounded-full"
        >
          <SlidersHorizontal className="size-5" aria-hidden="true" />
          {!isDefault(view) && (
            <span
              aria-hidden="true"
              className="bg-player-o absolute top-2 right-2 size-2 rounded-full"
            />
          )}
        </Button>
      </SheetHeader>

      <div className="bg-muted/70 dark:bg-muted/50 flex items-center gap-4 rounded-[18px] px-4 py-3">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--foreground) 0 ${percent}%, var(--muted) ${percent}% 100%)`,
          }}
        >
          <span className="bg-card font-heading grid size-11 place-items-center rounded-full text-sm font-semibold tabular-nums">
            {percent}%
          </span>
        </span>
        <div className="flex flex-1 justify-around">
          {TIERS_DOWN.map((tier) => {
            const all = ACHIEVEMENTS.filter((a) => a.tier === tier)
            const got = all.filter((a) => state.unlocks[a.id] !== undefined).length
            return (
              <span
                key={tier}
                aria-label={TIER_LABEL[tier]}
                className="flex flex-col items-center gap-0.5"
              >
                <Trophy className="size-5" style={{ color: TIER_COLOR[tier] }} aria-hidden="true" />
                <span className="text-[13px] font-semibold tabular-nums">
                  {got}/{all.length}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      <ScrollArea className="-mx-5 min-h-0 flex-1 px-5">
        {shown.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nothing here yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 pb-2">
            {shown.map((a) => (
              <Row
                key={a.id}
                a={a}
                at={state.unlocks[a.id]}
                revealed={revealed.has(a.id)}
                onReveal={() => reveal(a.id)}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
        <FloatingBack />
      </SheetContent>
    </Sheet>

      {/* A sibling of the sheet, not a child: a nested dialog would treat taps on the sheet as inside itself and never close. */}
      <ViewPopup open={popup} onOpenChange={setPopup} view={view} onChange={setView} />
    </>
  )
}

function Row({
  a,
  at,
  revealed,
  onReveal,
}: {
  a: Achievement
  at?: number
  revealed: boolean
  onReveal: () => void
}) {
  const unlocked = at !== undefined
  const secret = !unlocked && a.hidden && !revealed
  const body = (
    <>
      <span className="bg-card grid size-14 shrink-0 place-items-center rounded-[14px]">
        {secret ? (
          <span className="text-muted-foreground relative" aria-hidden="true">
            <Trophy className="size-7" />
            <Lock className="bg-card absolute -right-1 -bottom-1 size-4 rounded-sm" />
          </span>
        ) : (
          <AchievementIcon
            id={a.id}
            className={cn("size-7", !unlocked && "text-muted-foreground")}
            dimmed={!unlocked}
          />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="font-heading text-[15px] font-semibold">{secret ? "Hidden" : a.name}</span>
        <span className="text-muted-foreground text-[12.5px]">
          {secret ? "Description is hidden." : a.description}
        </span>
        <span className="mt-0.5 flex items-center justify-between">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: TIER_COLOR[a.tier] }}
          />
          <span className="text-muted-foreground text-[11px]">
            {unlocked ? dayFormat.format(at) : secret ? "" : "Locked"}
          </span>
        </span>
      </span>
    </>
  )
  const cls = cn(
    "flex w-full items-center gap-3 rounded-[18px] bg-muted/70 py-2.5 pl-2.5 pr-3 dark:bg-muted/50",
    !unlocked && "opacity-60",
  )
  return (
    <li data-testid="achievement" data-unlocked={unlocked} data-hidden={a.hidden}>
      {secret ? (
        <button
          type="button"
          aria-label="Hidden"
          onClick={onReveal}
          className={cn(cls, "active:bg-muted transition-colors")}
        >
          {body}
        </button>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  )
}

/** Sort, earned / locked, and tier, in a small sheet over the list. */
function ViewPopup({
  open,
  onOpenChange,
  view,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ListView
  onChange: (view: ListView) => void
}) {
  const set = <K extends keyof ListView>(key: K, value: ListView[K] | undefined) =>
    value !== undefined && onChange({ ...view, [key]: value })
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        initialFocus={(openType) => openType === "keyboard"}
        className="mx-auto flex w-full max-w-[420px] flex-col gap-5 rounded-t-[28px] px-5 pt-5"
        style={{ paddingBottom: "max(4.5rem, env(safe-area-inset-bottom))" }}
      >
        <SheetHeader className="flex-row items-center justify-between p-0 text-left">
          <SheetTitle className="font-heading text-xl font-semibold">Sort and filter</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reset"
            className="text-muted-foreground size-9 rounded-full"
            onClick={() => onChange(DEFAULT_VIEW)}
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </Button>
        </SheetHeader>

        <Group label="Sort">
          <ToggleGroup
            value={[view.sort]}
            onValueChange={(v: string[]) => set("sort", v[0] as SortOrder)}
            spacing={0}
            className={cn(segmentTrack, "grid-cols-3")}
            aria-label="Sort"
          >
            {SORTS.map((s) => (
              <ToggleGroupItem
                key={s.value}
                value={s.value}
                className={segmentItem}
                aria-label={s.label}
              >
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>

        <Group label="Show">
          <ToggleGroup
            value={[view.show]}
            onValueChange={(v: string[]) => set("show", v[0] as ShowFilter)}
            spacing={0}
            className={cn(segmentTrack, "grid-cols-3")}
            aria-label="Show"
          >
            {SHOWS.map((s) => (
              <ToggleGroupItem
                key={s.value}
                value={s.value}
                className={segmentItem}
                aria-label={s.label}
              >
                {s.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>

        <Group label="Tier">
          <ToggleGroup
            value={[view.tier]}
            onValueChange={(v: string[]) => set("tier", v[0] as ListView["tier"])}
            spacing={0}
            className={cn(segmentTrack, "grid-cols-5")}
            aria-label="Tier"
          >
            <ToggleGroupItem value="all" className={segmentItem} aria-label="Every tier">
              All
            </ToggleGroupItem>
            {TIERS_DOWN.map((tier) => (
              <ToggleGroupItem
                key={tier}
                value={tier}
                className={segmentItem}
                aria-label={TIER_LABEL[tier]}
              >
                <Trophy className="size-5" style={{ color: TIER_COLOR[tier] }} aria-hidden="true" />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Group>
        <FloatingBack />
      </SheetContent>
    </Sheet>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-heading px-1 text-sm font-medium">{label}</span>
      {children}
    </div>
  )
}
