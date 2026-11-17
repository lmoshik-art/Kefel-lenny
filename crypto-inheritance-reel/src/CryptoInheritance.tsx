import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CROSSFADE, SCENES } from "./constants";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";
import { Scene6 } from "./scenes/Scene6";
import { Background } from "./ui/Background";
import { Logo } from "./ui/Logo";

// Each scene runs CROSSFADE frames past its nominal end so the next scene can
// dissolve in on top of it. Text of the outgoing scene is fully gone by the
// nominal end (see Line), so two scenes' text never share a frame.
const len = (i: number) => SCENES[i].end - SCENES[i].start;

export const CryptoInheritance: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence name="Scene 1" from={SCENES[0].start} durationInFrames={len(0) + CROSSFADE} layout="none">
        <Scene1 length={len(0)} />
      </Sequence>
      <Sequence name="Scene 2" from={SCENES[1].start} durationInFrames={len(1) + CROSSFADE} layout="none">
        <Scene2 length={len(1)} />
      </Sequence>
      <Sequence name="Scene 3" from={SCENES[2].start} durationInFrames={len(2) + CROSSFADE} layout="none">
        <Scene3 length={len(2)} />
      </Sequence>
      <Sequence name="Scene 4" from={SCENES[3].start} durationInFrames={len(3) + CROSSFADE} layout="none">
        <Scene4 length={len(3)} />
      </Sequence>
      <Sequence name="Scene 5" from={SCENES[4].start} durationInFrames={len(4) + CROSSFADE} layout="none">
        <Scene5 length={len(4)} />
      </Sequence>
      <Sequence name="Scene 6" from={SCENES[5].start} durationInFrames={len(5)} layout="none">
        <Scene6 length={len(5)} />
      </Sequence>
      <Logo />
    </AbsoluteFill>
  );
};
