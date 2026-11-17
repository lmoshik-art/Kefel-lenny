import React from "react";
import { COLORS } from "../constants";
import { CopperDefs, brushFill, copperFill } from "./copper";

// Closed copper safe with a round dial and a handle. 300 x 320 viewbox.
export const Vault: React.FC<{ dialRotate?: number; id?: string }> = ({ dialRotate = 0, id = "vault" }) => (
  <svg width={300} height={320} viewBox="0 0 300 320">
    <CopperDefs id={id} />
    <g filter={`url(#${id}-shadow)`}>
      <rect x="10" y="10" width="280" height="300" rx="22" fill={copperFill(id)} />
      <rect x="10" y="10" width="280" height="300" rx="22" fill={brushFill(id)} />
    </g>
    {/* door inset */}
    <rect x="34" y="34" width="232" height="252" rx="14" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="6" />
    <rect x="34" y="34" width="232" height="252" rx="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
    {/* hinges */}
    <rect x="18" y="80" width="12" height="44" rx="4" fill={COLORS.copperDark} />
    <rect x="18" y="196" width="12" height="44" rx="4" fill={COLORS.copperDark} />
    {/* dial */}
    <g transform={`translate(150 160) rotate(${dialRotate})`}>
      <circle r="58" fill={copperFill(id, "copperV")} stroke="rgba(0,0,0,0.4)" strokeWidth="4" />
      <circle r="42" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="3" />
      {Array.from({ length: 24 }).map((_, i) => (
        <rect
          key={i}
          x="-1.5"
          y="-56"
          width="3"
          height={i % 6 === 0 ? 12 : 7}
          fill={i % 6 === 0 ? COLORS.copperLight : "rgba(0,0,0,0.45)"}
          transform={`rotate(${i * 15})`}
        />
      ))}
      <circle r="14" fill={COLORS.copperDark} />
      <circle r="8" fill={COLORS.copperLight} opacity="0.7" />
    </g>
    {/* handle */}
    <rect x="228" y="130" width="22" height="60" rx="8" fill={copperFill(id, "copperV")} stroke="rgba(0,0,0,0.4)" strokeWidth="3" />
    {/* feet */}
    <rect x="40" y="306" width="40" height="10" rx="3" fill={COLORS.copperDark} />
    <rect x="220" y="306" width="40" height="10" rx="3" fill={COLORS.copperDark} />
  </svg>
);
