import React from "react";
import { Img, staticFile } from "remotion";
import { COLORS, COPY } from "../constants";
import { fontFamily } from "../ui/fonts";

// 3 x 4 grid of masked copper pills, numbered 1 to 12. The pill body is the
// supplied image; number and mask dots are drawn on top.
export const PILL_W = 174;
export const PILL_H = 49;
export const PILL_GAP_X = 14;
export const PILL_GAP_Y = 16;
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
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingLeft: 18,
            paddingRight: 18,
            opacity: opacities[i] ?? 1,
            scale: String(1 + 0.04 * hl),
            filter: `brightness(${1 + 0.55 * hl}) drop-shadow(0 10px 12px rgba(0,0,0,0.4)) drop-shadow(0 0 ${14 * hl}px rgba(226,165,116,${0.7 * hl}))`,
            fontFamily,
          }}
        >
          <Img src={staticFile("assets/pill.png")} style={{ position: "absolute", inset: 0, width: PILL_W, height: PILL_H }} />
          <span style={{ position: "relative", fontSize: 16, fontWeight: 700, color: COLORS.copperText, width: 22 }}>{i + 1}</span>
          <span style={{ position: "relative", fontSize: 18, letterSpacing: 2, color: COLORS.copperLight, flex: 1, textAlign: "center" }}>
            {COPY.maskedPill}
          </span>
        </div>
      );
    })}
  </div>
);
