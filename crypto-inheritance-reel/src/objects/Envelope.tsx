import React from "react";
import { Img, staticFile } from "remotion";

// Supplied copper envelope image, 240 x 138.
export const ENVELOPE_W = 240;
export const Envelope: React.FC = () => (
  <Img
    src={staticFile("assets/envelope.png")}
    style={{ width: ENVELOPE_W, display: "block", filter: "drop-shadow(0 18px 16px rgba(0,0,0,0.45))" }}
  />
);
