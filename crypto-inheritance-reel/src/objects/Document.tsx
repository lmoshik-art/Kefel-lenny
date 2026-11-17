import React from "react";
import { Img, staticFile } from "remotion";

// Supplied paper document with a copper wax seal, in a 180 x 240 box.
export const SealedDocument: React.FC<{ id?: string }> = () => (
  <div style={{ width: 180, height: 240 }}>
    <Img
      src={staticFile("assets/document.png")}
      style={{ width: 168, height: 240, marginLeft: 6, display: "block", filter: "drop-shadow(0 18px 16px rgba(0,0,0,0.45))" }}
    />
  </div>
);
