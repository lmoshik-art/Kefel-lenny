import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, CROSSFADE, MOTION, TEXT_MARGIN, TEXT_TOP } from "../constants";
import { easeOut } from "../easing";
import { fontFamily } from "./fonts";

export type LineKind = "headline" | "copper" | "body" | "small";

const LINE_STYLE: Record<LineKind, React.CSSProperties> = {
  headline: { fontWeight: 700, fontSize: 68, color: COLORS.white, lineHeight: 1.25 },
  copper: { fontWeight: 700, fontSize: 54, color: COLORS.copperText, lineHeight: 1.25 },
  body: { fontWeight: 400, fontSize: 40, color: COLORS.body, lineHeight: 1.4, marginTop: 18 },
  small: { fontWeight: 400, fontSize: 30, color: COLORS.small, lineHeight: 1.4, marginTop: 26 },
};

// One text line. Enters with a spring (rise 24px + fade) unless `instant`.
// Exits during the last CROSSFADE frames of the scene (fade + 12px back down).
export const Line: React.FC<{
  kind: LineKind;
  index: number;
  instant?: boolean;
  sceneLength: number;
  children: React.ReactNode;
}> = ({ kind, index, instant, sceneLength, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = instant
    ? 1
    : spring({ frame: frame - index * MOTION.lineStagger, fps, config: MOTION.textSpring });
  const exit = interpolate(frame, [sceneLength - CROSSFADE, sceneLength], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <div
      style={{
        ...LINE_STYLE[kind],
        fontFamily,
        opacity: enter * exit,
        translate: `0px ${(1 - enter) * 24 + (1 - exit) * 12}px`,
      }}
    >
      {children}
    </div>
  );
};

// Numbered item: thin copper circle with the number on the right (RTL start),
// item text to its left.
export const NumberedItem: React.FC<{
  number: string;
  index: number;
  sceneLength: number;
  children: React.ReactNode;
}> = ({ number, index, sceneLength, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - index * MOTION.lineStagger, fps, config: MOTION.textSpring });
  const exit = interpolate(frame, [sceneLength - CROSSFADE, sceneLength], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 24,
        marginTop: 26,
        opacity: enter * exit,
        translate: `0px ${(1 - enter) * 24 + (1 - exit) * 12}px`,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 64,
          height: 64,
          borderRadius: 32,
          border: `2px solid ${COLORS.copperText}`,
          color: COLORS.copperText,
          fontFamily,
          fontWeight: 700,
          fontSize: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 0,
        }}
      >
        {number}
      </div>
      <div style={{ fontFamily, fontWeight: 400, fontSize: 40, color: COLORS.white, lineHeight: 1.4, paddingTop: 2 }}>
        {children}
      </div>
    </div>
  );
};

export const TextBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      dir="rtl"
      lang="he"
      style={{
        position: "absolute",
        top: TEXT_TOP,
        right: TEXT_MARGIN,
        left: TEXT_MARGIN,
        textAlign: "right",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
};
