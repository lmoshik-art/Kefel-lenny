import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, COPY } from "../constants";
import { easeInOut, easeOut } from "../easing";
import { SealedDocument } from "../objects/Document";
import { Envelope } from "../objects/Envelope";
import { Line, NumberedItem, TextBlock } from "../ui/Text";
import { ObjectLayer, Place, idle } from "./shared";

const HOLD = 20;

export const Scene6: React.FC<{ length: number }> = ({ length }) => {
  const raw = useCurrentFrame();
  // Freeze every motion for the final HOLD frames.
  const frame = Math.min(raw, length - HOLD);
  const d = idle(frame, 0, 5, 1.2);
  const e = idle(frame, 50, 5, 1);
  const glow = interpolate(frame, [40, 80], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const shine = interpolate(frame, [86, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const pulse = 0.9 + 0.1 * Math.sin(frame / 14);
  return (
    <>
      <ObjectLayer sceneLength={length} noExit holdFrames={HOLD}>
        <Place x={300} y={1150 + d.y} rotate={-4 + d.r} scale={1.1}>
          <SealedDocument id="s6doc" />
        </Place>
        <div
          style={{
            position: "absolute",
            left: 520,
            top: 1150,
            width: 300,
            height: 260,
            borderRadius: 150,
            background: `radial-gradient(ellipse at center, ${COLORS.copperLight} 0%, rgba(226,165,116,0) 65%)`,
            filter: "blur(18px)",
            opacity: glow * pulse,
          }}
        />
        <Place x={560} y={1205 + e.y} rotate={3 + e.r}>
          <Envelope glint={shine} />
        </Place>
      </ObjectLayer>
      <TextBlock>
        <Line kind="headline" index={0} sceneLength={length}>{COPY.scene6.headline}</Line>
        <NumberedItem number="01" index={1} sceneLength={length}>{COPY.scene6.item1}</NumberedItem>
        <NumberedItem number="02" index={2} sceneLength={length}>{COPY.scene6.item2}</NumberedItem>
        <Line kind="small" index={3} sceneLength={length}>{COPY.scene6.small}</Line>
      </TextBlock>
    </>
  );
};
