import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AppShell } from "./AppShell"

describe("AppShell", () => {
  it("renders children in the phone column, floated as a card on wide screens", () => {
    render(
      <AppShell>
        <p>hello</p>
      </AppShell>,
    )
    const main = screen.getByRole("main")
    expect(main).toHaveTextContent("hello")
    expect(main).toHaveClass("room-card")
  })

  it("draws a decorative backdrop behind the column: two glows and the faint logo", () => {
    render(<AppShell>x</AppShell>)
    const backdrop = screen.getByTestId("backdrop")
    expect(backdrop).toHaveAttribute("aria-hidden", "true")
    expect(backdrop.querySelector(".room-glow-x")).not.toBeNull()
    expect(backdrop.querySelector(".room-glow-o")).not.toBeNull()
    const marks = Array.from(
      backdrop.querySelectorAll("svg.room-logo [data-player]"),
    ) as HTMLElement[]
    expect(marks.map((m) => m.dataset.player).sort()).toEqual(["O", "X"])
  })
})

describe("AppShell room chrome", () => {
  it("signs the room with the logo top right and the version line bottom right", () => {
    render(<AppShell>x</AppShell>)
    const backdrop = screen.getByTestId("backdrop")
    const brand = backdrop.querySelector(".room-brand")
    expect(brand?.querySelector('svg [data-player="X"]')).not.toBeNull()
    expect(brand).toHaveTextContent("Tic-Tac-Toe")
    expect(backdrop.querySelector(".room-colophon")).toHaveTextContent(
      /^v\d+\.\d+\.\d+ · © \d{4} iam4bs$/,
    )
  })
})
