import React from "react";
import { Img, staticFile } from "remotion";
import { COLORS } from "../constants";
import { CopperDefs, brushFill, copperFill } from "./copper";

// Closed copper safe: body drawn as SVG, the dial is the supplied image so it
// can rotate as one piece. 300 x 320 box.
const DIAL = 126;
export const Vault: React.FC<{ dialRotate?: number; id?: string }> = ({ dialRotate = 0, id = "vault" }) => (
  <div style={{ position: "relative", width: 300, height: 320 }}>
    <svg width={300} height={320} viewBox="0 0 300 320" style={{ position: "absolute", inset: 0 }}>
      <CopperDefs id={id} />
      <g filter={`url(#${id}-shadow)`}>
        <rect x="10" y="10" width="280" height="300" rx="22" fill={copperFill(id)} />
        <rect x="10" y="10" width="280" height="300" rx="22" fill={brushFill(id)} />
      </g>
      <rect x="34" y="34" width="232" height="252" rx="14" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="6" />
      <rect x="34" y="34" width="232" height="252" rx="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
      <rect x="18" y="80" width="12" height="44" rx="4" fill={COLORS.copperDark} />
      <rect x="18" y="196" width="12" height="44" rx="4" fill={COLORS.copperDark} />
      {/* shallow recess behind the dial */}
      <circle cx="150" cy="160" r="66" fill="rgba(0,0,0,0.28)" />
      <rect x="228" y="130" width="22" height="60" rx="8" fill={copperFill(id, "copperV")} stroke="rgba(0,0,0,0.4)" strokeWidth="3" />
      <rect x="40" y="306" width="40" height="10" rx="3" fill={COLORS.copperDark} />
      <rect x="220" y="306" width="40" height="10" rx="3" fill={COLORS.copperDark} />
    </svg>
    <Img
      src={staticFile("assets/dial.png")}
      style={{
        position: "absolute",
        left: 150 - DIAL / 2,
        top: 160 - DIAL / 2,
        width: DIAL,
        height: DIAL,
        rotate: `${dialRotate}deg`,
        filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.45))",
      }}
    />
  </div>
);
