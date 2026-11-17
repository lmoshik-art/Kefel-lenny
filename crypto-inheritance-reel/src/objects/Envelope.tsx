import React from "react";
import { Img, staticFile } from "remotion";
import { MaskedGlint } from "./MaskedGlint";

// Supplied copper envelope image, 240 x 138.
export const ENVELOPE_W = 240;
const ENVELOPE_H = Math.round((240 * 706) / 1224);
export const Envelope: React.FC<{ glint?: number }> = ({ glint = 0 }) => (
  <div style={{ position: "relative", width: ENVELOPE_W, height: ENVELOPE_H }}>
    <Img
      src={staticFile("assets/envelope.png")}
      style={{ width: ENVELOPE_W, height: ENVELOPE_H, display: "block", filter: "drop-shadow(0 18px 16px rgba(0,0,0,0.45))" }}
    />
    <MaskedGlint src={staticFile("assets/envelope.png")} width={ENVELOPE_W} height={ENVELOPE_H} progress={glint} />
  </div>
);
