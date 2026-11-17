import React from "react";
import { COLORS } from "../constants";
import { CopperDefs, brushFill, copperFill } from "./copper";

// Copper key, 360 x 120 viewbox, bow on the right, bit on the left.
export const CopperKey: React.FC<{ id?: string }> = ({ id = "key" }) => (
  <svg width={360} height={120} viewBox="0 0 360 120">
    <CopperDefs id={id} />
    <g filter={`url(#${id}-shadow)`}>
      <circle cx="290" cy="60" r="52" fill={copperFill(id)} />
      <circle cx="290" cy="60" r="52" fill={brushFill(id)} />
      <circle cx="290" cy="60" r="24" fill={COLORS.bgEdge} />
      <rect x="40" y="48" width="210" height="24" rx="8" fill={copperFill(id, "copperFlat")} />
      <rect x="40" y="72" width="22" height="30" rx="4" fill={copperFill(id, "copperV")} />
      <rect x="76" y="72" width="22" height="22" rx="4" fill={copperFill(id, "copperV")} />
      <rect x="112" y="72" width="18" height="16" rx="4" fill={copperFill(id, "copperV")} />
    </g>
  </svg>
);
