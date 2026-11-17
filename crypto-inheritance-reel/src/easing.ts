import { Easing } from "remotion";

// Strong curves from the animation standards. Never built-in ease-in.
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);
export const easeInOut = Easing.bezier(0.77, 0, 0.175, 1);
