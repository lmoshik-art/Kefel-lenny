import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { easeInOut } from "../easing";
import { COPY } from "../constants";
import { SealedDocument } from "../objects/Document";
import { Vault } from "../objects/Vault";
import { Line, TextBlock } from "../ui/Text";
import { ObjectLayer, Place, idle } from "./shared";

export const Scene1: React.FC<{ length: number }> = ({ length }) => {
  const frame = useCurrentFrame();
  const v = idle(frame, 0, 5, 1);
  const d = idle(frame, 40, 6, 1.5);
  // Someone tries the dial: a short turn and back, the door stays shut.
  const glint = interpolate(frame, [34, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const dial = interpolate(frame, [18, 44, 70], [0, -22, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  return (
    <>
      <ObjectLayer sceneLength={length} instant>
        <Place x={100} y={1120 + v.y} rotate={v.r}>
          <Vault id="s1vault" dialRotate={dial} glint={glint} />
        </Place>
        <Place x={390} y={1215 + d.y} rotate={-9 + d.r}>
          <SealedDocument id="s1doc" />
        </Place>
      </ObjectLayer>
      <TextBlock>
        <Line kind="headline" index={0} instant sceneLength={length}>{COPY.scene1.headline}</Line>
        <Line kind="copper" index={1} instant sceneLength={length}>{COPY.scene1.copper}</Line>
      </TextBlock>
    </>
  );
};
