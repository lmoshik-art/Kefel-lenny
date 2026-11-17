import React from "react";

// A light band that sweeps across an image and is masked by that same image,
// so the glint never spills outside the object, even when it floats or rotates.
export const MaskedGlint: React.FC<{ src: string; width: number; height: number; progress: number; strength?: number }> = ({
  src,
  width,
  height,
  progress,
  strength = 0.5,
}) => {
  if (progress <= 0 || progress >= 1) return null;
  const mask = `url(${src})`;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,240,220,${strength}) 50%, rgba(255,255,255,0) 100%)`,
        backgroundSize: "45% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: `${-50 + progress * 200}% 0`,
      }}
    />
  );
};
