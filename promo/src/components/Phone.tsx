import type { ReactNode } from "react"
import { COLOR } from "../tokens"

// A plain phone outline (no brand, no notch detail) with content on its screen.
export function Phone({ height, children }: { height: number; children?: ReactNode }) {
  const width = height * 0.52
  return (
    <div
      style={{
        width,
        height,
        flex: "none",
        border: `${height * 0.018}px solid ${COLOR.muted}`,
        borderRadius: height * 0.11,
        padding: height * 0.05,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: height * 0.06,
          background: COLOR.tray,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: height * 0.04,
        }}
      >
        {children}
      </div>
    </div>
  )
}
