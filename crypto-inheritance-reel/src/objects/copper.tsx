import React from "react";
import { COLORS } from "../constants";

// Shared SVG defs for the brushed-copper look. Rendered once per object SVG
// (ids are scoped with a prefix so several objects can coexist in a frame).
export const CopperDefs: React.FC<{ id: string }> = ({ id }) => (
  <defs>
    <linearGradient id={`${id}-copper`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor={COLORS.copperLight} />
      <stop offset="50%" stopColor={COLORS.copperMid} />
      <stop offset="100%" stopColor={COLORS.copperDark} />
    </linearGradient>
    <linearGradient id={`${id}-copperFlat`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor={COLORS.copperDark} />
      <stop offset="45%" stopColor={COLORS.copperLight} />
      <stop offset="100%" stopColor={COLORS.copperMid} />
    </linearGradient>
    <linearGradient id={`${id}-copperV`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={COLORS.copperLight} />
      <stop offset="60%" stopColor={COLORS.copperMid} />
      <stop offset="100%" stopColor={COLORS.copperDark} />
    </linearGradient>
    {/* fine brushed lines, multiplied over the gradient */}
    <pattern id={`${id}-brush`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <rect width="4" height="4" fill="transparent" />
      <rect width="4" height="1" fill="rgba(255,255,255,0.10)" />
      <rect y="2" width="4" height="1" fill="rgba(0,0,0,0.12)" />
    </pattern>
    <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#000" floodOpacity="0.45" />
    </filter>
    <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="22" />
    </filter>
  </defs>
);

export const copperFill = (id: string, kind: "copper" | "copperFlat" | "copperV" = "copper") =>
  `url(#${id}-${kind})`;
export const brushFill = (id: string) => `url(#${id}-brush)`;
