import React from "react";

// Translucent glass pane that sits in front of the coins.
export const GlassPane: React.FC<{ width: number; height: number }> = ({ width, height }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 24,
      border: "2px solid rgba(255,255,255,0.28)",
      background:
        "linear-gradient(160deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.10) 100%)",
      boxShadow: "inset 0 0 40px rgba(255,255,255,0.06), 0 20px 40px rgba(0,0,0,0.35)",
      backdropFilter: "blur(1px)",
    }}
  />
);
