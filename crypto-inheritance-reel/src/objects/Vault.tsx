import React from "react";
import { Img, staticFile } from "remotion";
import { MaskedGlint } from "./MaskedGlint";

// Closed copper safe (supplied image) in a 300 x 320 box. The supplied dial
// image sits exactly over the dial painted on the door so it can rotate.
const W = 300;
const H = Math.round((300 * 1180) / 1163); // 304
const TOP = 10;
const S = W / 1163;
const DIAL_CX = 569 * S;
const DIAL_CY = TOP + 552 * S;
const DIAL = 114;

export const Vault: React.FC<{ dialRotate?: number; id?: string; glint?: number }> = ({ dialRotate = 0, glint = 0 }) => (
  <div style={{ position: "relative", width: 300, height: 320 }}>
    <Img
      src={staticFile("assets/safe.png")}
      style={{ position: "absolute", left: 0, top: TOP, width: W, height: H, filter: "drop-shadow(0 18px 16px rgba(0,0,0,0.45))" }}
    />
    <Img
      src={staticFile("assets/dial.png")}
      style={{
        position: "absolute",
        left: DIAL_CX - DIAL / 2,
        top: DIAL_CY - DIAL / 2,
        width: DIAL,
        height: DIAL,
        rotate: `${dialRotate}deg`,
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.4))",
      }}
    />
    <div style={{ position: "absolute", left: 0, top: TOP }}>
      <MaskedGlint src={staticFile("assets/safe.png")} width={W} height={H} progress={glint} strength={0.4} />
    </div>
  </div>
);
