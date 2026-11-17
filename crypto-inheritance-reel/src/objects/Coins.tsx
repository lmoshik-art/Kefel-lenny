import React from "react";
import { CopperDefs, copperFill } from "./copper";

// Stack of copper coins. `count` coins are drawn (0..8); the stack is anchored
// at the bottom so it empties from the top. 200 x 230 viewbox.
export const COIN_MAX = 8;
// `glint` (0..1) sweeps a light band across the coins only (clipped to them).
export const CoinStack: React.FC<{ count?: number; id?: string; glint?: number }> = ({ count = COIN_MAX, id = "coins", glint = 0 }) => (
  <svg width={200} height={230} viewBox="0 0 200 230">
    <CopperDefs id={id} />
    <clipPath id={`${id}-clip`}>
      {Array.from({ length: Math.max(0, Math.min(COIN_MAX, count)) }).map((_, i) => {
        const y = 200 - i * 22;
        return <rect key={i} x="20" y={y - 26} width="160" height="34" rx="16" />;
      })}
    </clipPath>
    <g filter={`url(#${id}-shadow)`}>
      {Array.from({ length: Math.max(0, Math.min(COIN_MAX, count)) }).map((_, i) => {
        const y = 200 - i * 22;
        return (
          <g key={i} transform={`translate(100 ${y})`}>
            <rect x="-80" y="-10" width="160" height="22" rx="4" fill={copperFill(id, "copperFlat")} />
            <ellipse cx="0" cy="-10" rx="80" ry="16" fill={copperFill(id, "copperV")} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
            <ellipse cx="0" cy="-10" rx="60" ry="11" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
          </g>
        );
      })}
    </g>
    {glint > 0 && glint < 1 ? (
      <g clipPath={`url(#${id}-clip)`}>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <rect x={-120 + glint * 340} y="0" width="90" height="230" fill={`url(#${id}-glint)`} transform={`skewX(-18)`} />
      </g>
    ) : null}
  </svg>
);
