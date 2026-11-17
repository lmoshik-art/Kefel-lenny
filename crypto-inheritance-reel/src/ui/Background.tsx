import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

// Persistent backdrop: radial forest-green gradient, soft vignette and a
// low-opacity film grain whose seed changes every frame.
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, opacity: 0.06, mixBlendMode: "overlay" }}
    >
      <filter id="grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves={2}
          seed={frame % 97}
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  );
};

export const Background: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 45%, ${COLORS.bgCenter} 0%, ${COLORS.bgEdge} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <Grain />
    </AbsoluteFill>
  );
};
