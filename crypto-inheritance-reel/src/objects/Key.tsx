import React from "react";
import { Img, staticFile } from "remotion";

// Supplied copper key image in a 360 x 120 box, bow on the right, bit on the left.
export const CopperKey: React.FC<{ id?: string }> = () => (
  <div style={{ width: 360, height: 120 }}>
    <Img
      src={staticFile("assets/key.png")}
      style={{ width: 334, height: 120, marginLeft: 13, display: "block", filter: "drop-shadow(0 18px 16px rgba(0,0,0,0.45))" }}
    />
  </div>
);
