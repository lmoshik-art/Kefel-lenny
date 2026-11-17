import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, COPY } from "../constants";
import { easeInOut, easeOut } from "../easing";
import { CoinStack } from "../objects/Coins";
import { CopperDefs, copperFill } from "../objects/copper";
import { Line, TextBlock } from "../ui/Text";
import { ObjectLayer, Place, idle } from "./shared";

const LINE_Y = 1210;
const FIRST_X = 900; // right marker (start, reads first in RTL)
const SECOND_X = 180; // left marker (end)

export const Scene5: React.FC<{ length: number }> = ({ length }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const m1 = interpolate(frame, [14, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const m2 = interpolate(frame, [24, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const tagIn = interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const slide = interpolate(frame, [48, 134], [FIRST_X, SECOND_X], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  // After reaching the second marker the tag settles onto the coin stack and
  // moves with it from then on.
  const attach = interpolate(frame, [138, 158], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const c = idle(frame, 20, 4, 0);
  const glint = interpolate(frame, [168, 204], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const tagX = slide + 150 * attach;
  const tagY = LINE_Y - 86 + (frame < 138 ? idle(frame, 0, 3, 0).y : 0) + (LINE_Y + 110 - (LINE_Y - 86)) * attach + c.y * attach;
  return (
    <>
      <ObjectLayer sceneLength={length}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <CopperDefs id="s5" />
          <line
            x1={FIRST_X}
            y1={LINE_Y}
            x2={FIRST_X - (FIRST_X - SECOND_X) * draw}
            y2={LINE_Y}
            stroke={COLORS.copperText}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <circle cx={FIRST_X} cy={LINE_Y} r={18} fill={copperFill("s5", "copperV")} stroke="rgba(0,0,0,0.35)" strokeWidth={3} opacity={m1} transform={`translate(${FIRST_X} ${LINE_Y}) scale(${0.9 + 0.1 * m1}) translate(${-FIRST_X} ${-LINE_Y})`} />
          <circle cx={SECOND_X} cy={LINE_Y} r={18} fill={copperFill("s5", "copperV")} stroke="rgba(0,0,0,0.35)" strokeWidth={3} opacity={m2} transform={`translate(${SECOND_X} ${LINE_Y}) scale(${0.9 + 0.1 * m2}) translate(${-SECOND_X} ${-LINE_Y})`} />
          {/* tag: rounded label with a hole and a small coin glyph, no text */}
          <g transform={`translate(${tagX} ${tagY}) scale(${0.9 + 0.1 * tagIn})`} opacity={tagIn} filter="url(#s5-shadow)">
            <path d="M-40 -28 H28 L52 0 L28 28 H-40 a8 8 0 0 1 -8 -8 V-20 a8 8 0 0 1 8 -8 Z" fill={copperFill("s5")} stroke="rgba(0,0,0,0.35)" strokeWidth={2} />
            <circle cx={34} cy={0} r={5} fill={COLORS.bgEdge} />
            <circle cx={-8} cy={0} r={13} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth={3} />
            <circle cx={-8} cy={0} r={6} fill="rgba(0,0,0,0.45)" />
          </g>
        </svg>
        <Place x={SECOND_X - 100} y={LINE_Y + 30 + c.y}>
          <CoinStack id="s5coins" glint={glint} />
        </Place>
      </ObjectLayer>
      <TextBlock>
        <Line kind="headline" index={0} sceneLength={length}>{COPY.scene5.headline}</Line>
        <Line kind="copper" index={1} sceneLength={length}>{COPY.scene5.copper}</Line>
        <Line kind="body" index={2} sceneLength={length}>{COPY.scene5.body}</Line>
      </TextBlock>
    </>
  );
};
