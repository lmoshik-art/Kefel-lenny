import React from "react";
import { CopperDefs, copperFill } from "./copper";

// Stack of copper coins. `count` coins are drawn (0..8); the stack is anchored
// at the bottom so it empties from the top. 200 x 230 viewbox.
export const COIN_MAX = 8;
export const CoinStack: React.FC<{ count?: number; id?: string }> = ({ count = COIN_MAX, id = "coins" }) => (
  <svg width={200} height={230} viewBox="0 0 200 230">
    <CopperDefs id={id} />
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
  </svg>
);
