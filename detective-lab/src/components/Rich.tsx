import { Fragment } from 'react'

/** תרגילים כמו 100 + 20 = 120 מוצגים משמאל לימין גם בתוך משפט עברי */
const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)`
const EQ = new RegExp(String.raw`(${NUM}(?:\s*[×:+=]\s*${NUM})+)`, 'g')

export function Rich({ text }: { text: string }) {
  const parts = text.split(EQ)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <bdi key={i} dir="ltr">
            {p}
          </bdi>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}
