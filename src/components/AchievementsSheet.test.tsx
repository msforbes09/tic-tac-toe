import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AchievementsSheet } from "./AchievementsSheet"
import { EMPTY_STATE } from "@/lib/achievements"

const state = {
  ...EMPTY_STATE,
  unlocks: { "hello-bot": new Date(2026, 8, 20).getTime(), "the-immovable": 1 },
}
const rows = () => screen.getAllByTestId("achievement").map((el) => el.textContent ?? "")
const openPopup = () => fireEvent.click(screen.getByRole("button", { name: "Sort and filter" }))
const pick = (name: string) => fireEvent.click(screen.getByRole("button", { name, hidden: true }))

describe("AchievementsSheet", () => {
  it("shows the unlocked count, the tier-weighted percent, and the per-tier counts", () => {
    const four = { ...EMPTY_STATE, unlocks: { "hello-bot": 1, closer: 2, "the-immovable": 3, "grand-master": 4 } }
    const { rerender } = render(<AchievementsSheet open onOpenChange={() => {}} state={four} />)
    expect(screen.getByText("4 of 41 unlocked")).toBeInTheDocument()
    expect(screen.getByText("13%")).toBeInTheDocument()
    rerender(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    expect(screen.getByText("2 of 41 unlocked")).toBeInTheDocument()
    expect(screen.getByText("5%")).toBeInTheDocument()
    expect(screen.getByLabelText("Bronze")).toHaveTextContent("1/16")
    expect(screen.getByLabelText("Gold")).toHaveTextContent("1/10")
    expect(screen.getByLabelText("Platinum")).toHaveTextContent("0/1")
  })

  it("lists rows newest unlock first, dates earned ones, marks locked ones, and keeps hidden ones secret", () => {
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    const all = rows()
    expect(all[0]).toContain("Hello, Bot")
    expect(all[0]).toContain(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(2026, 8, 20)),
    )
    expect(all[1]).toContain("The Immovable")
    expect(all[2]).toContain("Grand Master")
    expect(all[2]).toContain("Locked")
    expect(screen.queryByText("Night Owl")).toBeNull()
    expect(screen.getAllByText("Description is hidden.").length).toBeGreaterThan(0)
  })

  it("reveals a hidden row on tap, and forgets it when the sheet reopens", () => {
    const { rerender } = render(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    const secret = screen.getAllByRole("button", { name: "Hidden" })
    fireEvent.click(secret[0])
    expect(screen.getAllByRole("button", { name: "Hidden" })).toHaveLength(secret.length - 1)
    const revealed = screen
      .getAllByTestId("achievement")
      .find((el) => el.dataset.hidden === "true" && !within(el).queryByText("Hidden"))
    expect(revealed).toBeDefined()
    rerender(<AchievementsSheet open={false} onOpenChange={() => {}} state={state} />)
    rerender(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    expect(screen.getAllByRole("button", { name: "Hidden" })).toHaveLength(secret.length)
  })

  it("sorts and filters from the popup, marks the button while off the default, and resets", () => {
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    const button = screen.getByRole("button", { name: "Sort and filter" })
    expect(button).toHaveAttribute("data-active", "false")
    openPopup()
    expect(
      screen.getByRole("heading", { name: "Sort and filter", hidden: true }),
    ).toBeInTheDocument()
    pick("Earned")
    expect(rows()).toHaveLength(2)
    pick("Oldest")
    expect(rows()[0]).toContain("The Immovable")
    pick("Gold")
    expect(rows()).toHaveLength(1)
    pick("Platinum")
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Done", hidden: true })).toBeNull()
    expect(screen.queryByRole("button", { name: "Close", hidden: true })).toBeNull()
    fireEvent.click(screen.getAllByRole("button", { name: "Back", hidden: true }).at(-1)!)
    expect(button).toHaveAttribute("data-active", "true")
    openPopup()
    pick("Reset")
    expect(button).toHaveAttribute("data-active", "false")
    expect(rows()).toHaveLength(41)
  })

  it("the popup closes on a tap outside it", () => {
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    openPopup()
    expect(screen.getByRole("heading", { name: "Sort and filter", hidden: true })).toBeInTheDocument()
    fireEvent.pointerDown(document.body)
    fireEvent.pointerUp(document.body)
    fireEvent.click(document.body)
    expect(screen.queryByRole("heading", { name: "Sort and filter", hidden: true })).toBeNull()
  })

  it("closes from one floating Back button and nothing else", () => {
    const onOpenChange = vi.fn()
    render(<AchievementsSheet open onOpenChange={onOpenChange} state={state} />)
    expect(screen.getAllByRole("button", { name: /^(back|close)$/i })).toHaveLength(1)
    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(onOpenChange.mock.calls[0][0]).toBe(false)
  })

  it("tier sort puts platinum first regardless of unlocks", () => {
    render(<AchievementsSheet open onOpenChange={() => {}} state={state} />)
    openPopup()
    pick("Tier")
    pick("Locked")
    expect(rows()[0]).toContain("Grand Master")
    expect(rows()).toHaveLength(39)
  })
})
