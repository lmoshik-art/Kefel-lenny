import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COPY } from "../constants";
import { easeInOut, easeOut } from "../easing";
import { SealedDocument } from "../objects/Document";
import { PillGrid } from "../objects/Pills";
import { Vault } from "../objects/Vault";
import { Line, TextBlock } from "../ui/Text";
import { ObjectLayer, Place, idle } from "./shared";

const VAULT_X = 100;
const VAULT_Y = 1120;
const DOC_START_X = 390;
const DOC_END_X = 290;
const TAP = 42;

export const Scene2: React.FC<{ length: number }> = ({ length }) => {
  const frame = useCurrentFrame();
  const v = idle(frame, 0, 4, 0.8);
  // Document travels to the door (on-screen movement: ease-in-out), then
  // rebounds a few px off the door.
  const travel = interpolate(frame, [14, TAP], [DOC_START_X, DOC_END_X], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const rebound = interpolate(frame, [TAP, TAP + 12], [0, 14], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const docRotate = interpolate(frame, [14, TAP], [-9, -4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  // Vault shakes on the tap: decaying oscillation, stays locked.
  const shakeEnv = interpolate(frame, [TAP, TAP + 16], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  const shake = frame >= TAP ? Math.sin((frame - TAP) * 1.9) * 7 * shakeEnv : 0;
  const dial = frame >= TAP ? Math.sin((frame - TAP) * 1.2) * 6 * shakeEnv : 0;
  // Pills fade in with a 3-frame stagger from frame 72.
  const pillOpacities = Array.from({ length: 12 }).map((_, i) =>
    interpolate(frame, [72 + i * 2, 84 + i * 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut }),
  );
  const gridRise = interpolate(frame, [72, 96], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut });
  return (
    <>
      <ObjectLayer sceneLength={length}>
        <Place x={VAULT_X + shake} y={VAULT_Y + v.y} rotate={v.r}>
          <Vault id="s2vault" dialRotate={dial} />
        </Place>
        <Place x={travel + rebound} y={1215 + idle(frame, 40, 5, 0).y} rotate={docRotate}>
          <SealedDocument id="s2doc" />
        </Place>
        <Place x={520} y={1118 + gridRise}>
          <PillGrid opacities={pillOpacities} />
        </Place>
      </ObjectLayer>
      <TextBlock>
        <Line kind="headline" index={0} sceneLength={length}>{COPY.scene2.headline}</Line>
        <Line kind="copper" index={1} sceneLength={length}>{COPY.scene2.copper}</Line>
        <Line kind="body" index={2} sceneLength={length}>{COPY.scene2.body}</Line>
      </TextBlock>
    </>
  );
};
