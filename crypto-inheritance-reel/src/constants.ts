// All Hebrew copy for the reel, verbatim from the brief. Do not edit wording here
// without updating the brief; check character for character.

export const COPY = {
  scene1: {
    headline: "יש לכם צוואה.",
    copper: "ליורשים שלכם עדיין אין גישה לביטקוין.",
  },
  scene2: {
    headline: "צו ירושה קובע מי היורש.",
    copper: "הוא לא פותח את הארנק.",
    body: "את המטבעות מזיז רק המפתח הפרטי, או 12 מילות השחזור.",
  },
  scene3: {
    headline: "המפתח אבד?",
    copper: "המטבעות נשארים, ואף אחד לא יכול להזיז אותם.",
  },
  scene4: {
    headline: "וגם הפוך:",
    copper: "מי שמחזיק במילים יכול לרוקן את הארנק.",
    body: "לכן לא כותבים אותן בצוואה עצמה.",
  },
  scene5: {
    headline: "ומה עם המס?",
    copper: "ירושה אינה מכירה.",
    body: "אבל כשהיורש מוכר, מחיר הרכישה ויום הרכישה הם של המוריש.",
  },
  scene6: {
    headline: "מתכננים מראש",
    item1: "צוואה שמזכירה את הנכסים הדיגיטליים",
    item2: "הוראות גישה נפרדות, שמורות במקום בטוח",
    small: "מידע כללי, לא ייעוץ משפטי.",
  },
  logoFallback: "SYGON HALEVI",
  maskedPill: "• • • • •",
} as const;

// Timeline (frames at 30fps). Scene N occupies [start, end); the cross-fade
// into the next scene uses the last CROSSFADE frames of N and the first
// CROSSFADE frames of N+1.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION = 1050;
export const CROSSFADE = 10;

export const SCENES = [
  { id: "scene1", start: 0, end: 90 },
  { id: "scene2", start: 90, end: 300 },
  { id: "scene3", start: 300, end: 480 },
  { id: "scene4", start: 480, end: 690 },
  { id: "scene5", start: 690, end: 900 },
  { id: "scene6", start: 900, end: 1050 },
] as const;

// Brand
export const COLORS = {
  bgCenter: "#1E3D33",
  bgEdge: "#0F2A22",
  copperLight: "#E2A574",
  copperMid: "#B8693A",
  copperDark: "#7A4122",
  copperText: "#C8814A",
  white: "#FFFFFF",
  body: "#D9D9D4",
  small: "#A8A89F",
  paper: "#EAE3D2",
  paperShade: "#D6CDB8",
} as const;

// Layout
export const TEXT_TOP = 300;
export const TEXT_MARGIN = 90;
export const SAFE_BOTTOM = 1920 - 380; // nothing textual below this line
export const OBJECT_TOP = 1050;
export const OBJECT_BOTTOM = 1500;

// Motion tokens (frames)
export const MOTION = {
  lineStagger: 8,
  textExit: CROSSFADE,
  textSpring: { damping: 200 },
} as const;
