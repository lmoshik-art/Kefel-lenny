import React from "react";
import { Img, staticFile } from "remotion";

// Stack of supplied coin images in a 200 x 230 box, anchored at the bottom so
// it empties from the top. `glint` (0..1) sweeps a light band across the
// coins only (the coin image is used as a mask).
export const COIN_MAX = 8;
const COIN_W = 170;
const COIN_H = 86;
const STEP = 18;
const coinSrc = staticFile("assets/coin.png");

export const CoinStack: React.FC<{ count?: number; id?: string; glint?: number }> = ({ count = COIN_MAX, glint = 0 }) => {
  const n = Math.max(0, Math.min(COIN_MAX, count));
  return (
    <div style={{ position: "relative", width: 200, height: 230, filter: "drop-shadow(0 18px 16px rgba(0,0,0,0.45))" }}>
      {Array.from({ length: n }).map((_, i) => {
        const top = 230 - 10 - COIN_H - i * STEP;
        const mask = `url(${coinSrc})`;
        return (
          <div key={i} style={{ position: "absolute", left: 15, top, width: COIN_W, height: COIN_H }}>
            <Img src={coinSrc} style={{ width: COIN_W, height: COIN_H, display: "block" }} />
            {glint > 0 && glint < 1 ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  WebkitMaskImage: mask,
                  maskImage: mask,
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
                  background: `linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,240,220,0.55) 50%, rgba(255,255,255,0) 100%)`,
                  backgroundSize: "45% 100%",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: `${-50 + glint * 200}% 0`,
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
