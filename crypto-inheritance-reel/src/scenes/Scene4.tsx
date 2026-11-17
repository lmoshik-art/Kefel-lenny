import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, COPY } from "../constants";
import { easeInOut, easeOut } from "../easing";
import { COIN_MAX, CoinStack } from "../objects/Coins";
import { GRID_H, GRID_W, PillGrid } from "../objects/Pills";
import { Line, TextBlock } from "../ui/Text";
import { ObjectLayer, Place } from "./shared";

const S = 0.55;
const GW = GRID_W * S; // ~298
const GH = GRID_H * S; // ~140
const GRID_Y = 1060;
const CENTER_X = (1080 - GW) / 2;
const TARGETS = [60, CENTER_X, 1080 - 60 - GW];
const COINS_X = 440;
const COINS_Y = 1270;
const COIN_TOP = { x: COINS_X + 100, y: COINS_Y + 12 };

const FULL = Array.from({ length: 12 }).map(() => 1);

export const Scene4: React.FC<{ length: number }> = ({ length }) => {
  const frame = useCurrentFrame();
  const split = interpolate(frame, [12, 52], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const draw = interpolate(frame, [58, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const coins = Math.round(interpolate(frame, [108, 192], [COIN_MAX, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <>
      <ObjectLayer sceneLength={length}>
        {/* flow lines, under the grids and the coins */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {TARGETS.map((tx, i) => {
            const x0 = tx + GW / 2;
            const y0 = GRID_Y + GH + 6;
            const d = `M ${x0} ${y0} C ${x0} ${y0 + 90}, ${COIN_TOP.x} ${COIN_TOP.y - 110}, ${COIN_TOP.x} ${COIN_TOP.y}`;
            const len = 420;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={COLORS.copperText}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - draw)}
                opacity={0.9 * split}
              />
            );
          })}
        </svg>
        {TARGETS.map((tx, i) => (
          <Place key={i} x={CENTER_X + (tx - CENTER_X) * split} y={GRID_Y} opacity={i === 1 ? 1 : Math.min(1, split * 3)}>
            <PillGrid opacities={FULL} scale={S} />
          </Place>
        ))}
        <Place x={COINS_X} y={COINS_Y}>
          <CoinStack id="s4coins" count={coins} />
        </Place>
      </ObjectLayer>
      <TextBlock>
        <Line kind="headline" index={0} sceneLength={length}>{COPY.scene4.headline}</Line>
        <Line kind="copper" index={1} sceneLength={length}>{COPY.scene4.copper}</Line>
        <Line kind="body" index={2} sceneLength={length}>{COPY.scene4.body}</Line>
      </TextBlock>
    </>
  );
};
