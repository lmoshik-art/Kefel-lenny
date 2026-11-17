import React from "react";
import { COLORS } from "../constants";
import { CopperDefs, copperFill } from "./copper";

// Paper document with masked text lines and a copper wax seal. 180 x 240.
export const SealedDocument: React.FC<{ id?: string }> = ({ id = "doc" }) => (
  <svg width={180} height={240} viewBox="0 0 180 240">
    <CopperDefs id={id} />
    <g filter={`url(#${id}-shadow)`}>
      <path d="M12 6 H132 L168 42 V228 a6 6 0 0 1 -6 6 H18 a6 6 0 0 1 -6 -6 Z" fill={COLORS.paper} />
    </g>
    <path d="M132 6 V42 H168 Z" fill={COLORS.paperShade} />
    {[70, 92, 114, 136, 158].map((y, i) => (
      <rect key={y} x="30" y={y} width={i === 4 ? 70 : 120} height="8" rx="4" fill="rgba(122,65,34,0.35)" />
    ))}
    {/* wax seal */}
    <g transform="translate(118 190)">
      <circle r="26" fill={copperFill(id, "copperV")} stroke="rgba(0,0,0,0.35)" strokeWidth="2" />
      <circle r="17" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
      <circle r="6" fill={COLORS.copperDark} />
    </g>
  </svg>
);
