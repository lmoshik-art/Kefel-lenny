import { asset } from '../lib/assets'

export function Background({ table }: { table?: number }) {
  const image = table ? asset(`bg-${table}.png`) : asset('bg-5.png')
  return <div className="app-bg" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
}
