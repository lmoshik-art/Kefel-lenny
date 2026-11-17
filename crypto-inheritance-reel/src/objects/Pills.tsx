import React from "react";
import { COLORS, COPY } from "../constants";
import { fontFamily } from "../ui/fonts";

// 3 x 4 grid of masked copper pills, numbered 1 to 12. Each pill gets its own
// opacity so the grid can fade in with a stagger.
export const PILL_W = 170;
export const PILL_H = 52;
export const PILL_GAP_X = 16;
export const PILL_GAP_Y = 14;
export const GRID_W = PILL_W * 3 + PILL_GAP_X * 2;
export const GRID_H = PILL_H * 4 + PILL_GAP_Y * 3;

export const PillGrid: React.FC<{ opacities: number[]; highlights?: number[]; scale?: number }> = ({ opacities, highlights, scale = 1 }) => (
  <div
    dir="ltr"
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(3, ${PILL_W}px)`,
      gap: `${PILL_GAP_Y}px ${PILL_GAP_X}px`,
      width: GRID_W,
      scale: String(scale),
      transformOrigin: "top left",
    }}
  >
    {Array.from({ length: 12 }).map((_, i) => {
      const hl = highlights?.[i] ?? 0;
      return (
      <div
        key={i}
        style={{
          width: PILL_W,
          height: PILL_H,
          borderRadius: PILL_H / 2,
          border: `2px solid ${hl > 0.5 ? COLORS.copperLight : COLORS.copperMid}`,
          background: `linear-gradient(135deg, rgba(226,165,116,${0.22 + 0.45 * hl}), rgba(122,65,34,${0.22 + 0.3 * hl}))`,
          boxShadow: `0 10px 18px rgba(0,0,0,0.35), 0 0 ${18 * hl}px rgba(226,165,116,${0.55 * hl})`,
          scale: String(1 + 0.04 * hl),
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingLeft: 14,
          paddingRight: 14,
          opacity: opacities[i] ?? 1,
          fontFamily,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.copperText, width: 22 }}>{i + 1}</span>
        <span style={{ fontSize: 18, letterSpacing: 2, color: COLORS.copperLight, flex: 1, textAlign: "center" }}>
          {COPY.maskedPill}
        </span>
      </div>
      );
    })}
  </div>
);
