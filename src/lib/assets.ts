/** בונה כתובת לנכס גרפי יחסית לכתובת הבסיס של האתר, כדי שהאפליקציה תעבוד גם בנתיב משנה */
export function asset(name: string): string {
  return `${import.meta.env.BASE_URL}assets/${name}`
}
