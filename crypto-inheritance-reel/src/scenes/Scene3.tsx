import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, COPY } from "../constants";
import { easeOut } from "../easing";
import { CoinStack } from "../objects/Coins";
import { GlassPane } from "../objects/Glass";
import { CopperKey } from "../objects/Key";
import { Line, TextBlock } from "../ui/Text";
import { ObjectLayer, Place, idle } from "./shared";

const KEY_X = 110;
const KEY_Y = 1250;
const BREAK = 56;
const GONE = 120;

// Deterministic pseudo-random particles sourced from the key's bounding box.
const PARTICLES = Array.from({ length: 30 }).map((_, i) => {
  const t = (i * 0.618033) % 1;
  const u = ((i * 7919) % 97) / 97;
  const angle = -Math.PI * 0.85 + t * Math.PI * 0.75; // mostly upward and outward
  return {
    sx: 30 + u * 320,
    sy: 30 + t * 70,
    dx: Math.cos(angle) * (70 + u * 110),
    dy: Math.sin(angle) * (60 + t * 100),
    size: 6 + ((i * 13) % 9),
    delay: (i * 5) % 14,
    round: i % 3 !== 0,
  };
});

export const Scene3: React.FC<{ length: number }> = ({ length }) => {
  const frame = useCurrentFrame();
  const k = idle(Math.min(frame, BREAK), 10, 9, 2);
  const keyOpacity = interpolate(frame, [BREAK, BREAK + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const keyScale = interpolate(frame, [BREAK, BREAK + 10], [1, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  return (
    <>
      <ObjectLayer sceneLength={length}>
        {/* coins behind glass: no motion at all, that is the point */}
        <Place x={690} y={1170}>
          <CoinStack id="s3coins" />
        </Place>
        <Place x={600} y={1080}>
          <GlassPane width={380} height={400} />
        </Place>
        {/* key, floating until it breaks */}
        <Place x={KEY_X} y={KEY_Y + k.y} rotate={-6 + k.r} scale={keyScale} opacity={keyOpacity}>
          <CopperKey id="s3key" />
        </Place>
        {PARTICLES.map((p, i) => {
          const start = BREAK + p.delay;
          const prog = interpolate(frame, [start, GONE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
          const op = interpolate(frame, [start, start + 4, GONE - 20, GONE], [0, 1, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: KEY_X + p.sx,
                top: KEY_Y + k.y + p.sy,
                translate: `${p.dx * prog}px ${p.dy * prog}px`,
                width: p.size,
                height: p.round ? p.size : p.size * 0.6,
                borderRadius: p.round ? p.size : 2,
                rotate: `${prog * 140}deg`,
                background: `linear-gradient(135deg, ${COLORS.copperLight}, ${COLORS.copperDark})`,
                opacity: op,
                boxShadow: "0 6px 10px rgba(0,0,0,0.35)",
              }}
            />
          );
        })}
      </ObjectLayer>
      <TextBlock>
        <Line kind="headline" index={0} sceneLength={length}>{COPY.scene3.headline}</Line>
        <Line kind="copper" index={1} sceneLength={length}>{COPY.scene3.copper}</Line>
      </TextBlock>
    </>
  );
};
