import React from "react";
import { CopperDefs, brushFill, copperFill } from "./copper";

// Small closed copper envelope, 220 x 150 viewbox.
export const Envelope: React.FC<{ id?: string }> = ({ id = "env" }) => (
  <svg width={220} height={150} viewBox="0 0 220 150">
    <CopperDefs id={id} />
    <g filter={`url(#${id}-shadow)`}>
      <rect x="10" y="20" width="200" height="120" rx="12" fill={copperFill(id)} />
      <rect x="10" y="20" width="200" height="120" rx="12" fill={brushFill(id)} />
    </g>
    <path d="M10 32 L110 98 L210 32" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="5" strokeLinejoin="round" />
    <path d="M10 32 L110 98 L210 32" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="110" cy="98" r="9" fill={copperFill(id, "copperV")} stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
  </svg>
);
