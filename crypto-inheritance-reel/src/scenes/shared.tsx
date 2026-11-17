import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CROSSFADE } from "../constants";
import { easeInOut } from "../easing";

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
  holdFrames?: number;
  children: React.ReactNode;
}> = ({ sceneLength, instant, noExit, holdFrames = 0, children }) => {
  const frame = useCurrentFrame();
  // Slow push-in over the scene keeps the object band alive between beats.
  const drift = interpolate(Math.min(frame, sceneLength - holdFrames), [0, sceneLength], [1, 1.035], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: fadeIn * fadeOut,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        scale: String(drift),
        transformOrigin: "540px 1275px",
      }}
    >
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

// A soft diagonal light band sweeping across a region once, for a glint on
// metal or glass. Clipped to the region so it reads as a reflection.
export const Sheen: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  start: number;
  duration?: number;
  strength?: number;
}> = ({ x, y, w, h, radius = 16, start, duration = 36, strength = 0.7 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  if (frame < start || frame > start + duration) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: radius, overflow: "hidden", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: -h,
          left: 0,
          width: w * 0.6,
          height: h * 3,
          translate: `${-w * 0.8 + t * (w * 1.6)}px 0px`,
          rotate: "20deg",
          background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,240,220,${strength}) 50%, rgba(255,255,255,0) 100%)`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
};
