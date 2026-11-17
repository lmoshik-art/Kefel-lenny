import React from "react";
import { Img, staticFile } from "remotion";
import { COLORS, COPY } from "../constants";

// public/logo.png exists in this project, so the image is used. The text
// fallback is kept for projects without a logo file.
const HAS_LOGO = true;

export const Logo: React.FC = () => {
  if (HAS_LOGO) {
    return (
      <Img
        src={staticFile("logo.png")}
        style={{ position: "absolute", top: 60, left: 60, width: 140, opacity: 0.92 }}
      />
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 60,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontWeight: 300,
        fontSize: 26,
        letterSpacing: 4,
        color: COLORS.copperText,
      }}
    >
      {COPY.logoFallback}
    </div>
  );
};
