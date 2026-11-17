import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS, HEIGHT, WIDTH } from "./constants";
import { CryptoInheritance } from "./CryptoInheritance";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CryptoInheritance"
      component={CryptoInheritance}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
