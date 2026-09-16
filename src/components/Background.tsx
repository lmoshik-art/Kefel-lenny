export function Background({ table }: { table?: number }) {
  const image = table ? `/assets/bg-${table}.png` : '/assets/bg-5.png'
  return <div className="app-bg" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
}
