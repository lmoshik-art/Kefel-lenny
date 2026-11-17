import { loadFont } from "@remotion/google-fonts/Heebo";

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "700"],
  subsets: ["hebrew", "latin"],
});
