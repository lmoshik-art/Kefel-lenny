import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CROSSFADE } from "../constants";

// Slow idle motion for a resting object: a few px of float and up to ~1.5deg of
// rotation. `phase` offsets objects so they do not move in unison.
export const idle = (frame: number, phase = 0, amp = 6, rot = 1.5) => ({
  y: Math.sin((frame + phase) / 34) * amp,
  r: Math.sin((frame + phase) / 52) * rot,
});

// Object layer of a scene: fades in over the first CROSSFADE frames (unless
// `instant`) and out over the last CROSSFADE frames so adjacent scenes
// dissolve into each other.
export const ObjectLayer: React.FC<{
  sceneLength: number;
  instant?: boolean;
  noExit?: boolean;
  children: React.ReactNode;
}> = ({ sceneLength, instant, noExit, children }) => {
  const frame = useCurrentFrame();
  // Linear on both sides so the dissolve's summed opacity stays flat; a
  // few px of blur masks the two object sets while they overlap.
  const fadeIn = instant
    ? 1
    : interpolate(frame, [0, CROSSFADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = noExit
    ? 1
    : interpolate(frame, [sceneLength - CROSSFADE, sceneLength], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = Math.max(instant ? 0 : (1 - fadeIn) * 3, noExit ? 0 : (1 - fadeOut) * 3);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fadeIn * fadeOut, filter: blur > 0.05 ? `blur(${blur}px)` : undefined }}>
      {children}
    </div>
  );
};

export const Place: React.FC<{
  x: number;
  y: number;
  rotate?: number;
  scale?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ x, y, rotate = 0, scale = 1, opacity = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      rotate: `${rotate}deg`,
      scale: String(scale),
      opacity,
      transformOrigin: "center center",
    }}
  >
    {children}
  </div>
);
