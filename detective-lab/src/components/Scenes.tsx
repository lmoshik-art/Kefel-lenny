import { useEffect, useRef, useState } from 'react'
import type { AssetSlot, Settings } from '../types'

const BASE = import.meta.env.BASE_URL

export function assetUrl(src: string) {
  return /^https?:/.test(src) ? src : `${BASE}${src.replace(/^\//, '')}`
}

/** תמונת אווירה: אם הוגדר נכס ב-assets.json הוא מוצג, ואחרת מוצגת סצנה מקומית שנבנתה ב-CSS */
export function AmbientImage({ slot, fallback, className = '' }: { slot?: AssetSlot; fallback: 'office' | 'evidence' | 'none'; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (slot?.src && !failed) {
    return (
      <div className={`ambient ${className}`}>
        <img src={assetUrl(slot.src)} alt="" onError={() => setFailed(true)} />
      </div>
    )
  }
  if (fallback === 'none') return null
  return fallback === 'office' ? <OfficeScene className={className} /> : <EvidenceScene className={className} />
}

export function OfficeScene({ className = '' }: { className?: string }) {
  return (
    <div className={`ambient scene-office ${className}`} aria-hidden="true">
      <div className="window">
        <div className="rain" />
        <div className="city">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} style={{ height: `${30 + ((i * 37) % 55)}%` }} />
          ))}
        </div>
      </div>
      <div className="lamp">
        <span className="lamp-head" />
        <span className="lamp-light" />
      </div>
      <div className="desk">
        <span className="folder f1" />
        <span className="folder f2" />
        <span className="folder f3" />
      </div>
    </div>
  )
}

function EvidenceScene({ className = '' }: { className?: string }) {
  return (
    <div className={`ambient scene-evidence ${className}`} aria-hidden="true">
      <span className="ev ev-jar" />
      <span className="ev ev-key" />
      <span className="ev ev-cup" />
      <span className="ev-tag" />
      <span className="ev-light" />
    </div>
  )
}

/** נגן קליפים קצר: ניתן לעצירה ולדילוג, ועובד גם בלי קובץ וידאו באמצעות אנימציה מקומית */
export function ClipPlayer({ slot, variant, caption, onClose, reduceMotion }: { slot?: AssetSlot; variant: 'intro' | 'outro'; caption: string; onClose: () => void; reduceMotion: boolean }) {
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const useVideo = !!slot?.src && !failed

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (useVideo || paused || reduceMotion) return
    const t = window.setTimeout(onClose, 7000)
    return () => window.clearTimeout(t)
  }, [useVideo, paused, reduceMotion, onClose])

  const togglePause = () => {
    if (useVideo && videoRef.current) {
      if (videoRef.current.paused) void videoRef.current.play()
      else videoRef.current.pause()
    }
    setPaused(!paused)
  }

  return (
    <div className="clip-overlay" role="dialog" aria-modal="true" aria-label={caption}>
      <div className="clip-frame">
        {useVideo ? (
          <video
            ref={videoRef}
            src={assetUrl(slot!.src)}
            poster={slot!.poster ? assetUrl(slot!.poster) : undefined}
            autoPlay={!reduceMotion}
            muted
            playsInline
            onEnded={onClose}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className={`clip-fallback ${variant} ${paused || reduceMotion ? 'paused' : ''}`} aria-hidden="true">
            {variant === 'intro' ? (
              <>
                <div className="street">
                  <span className="bld b1" />
                  <span className="bld b2">
                    <span className="lab-window" />
                  </span>
                  <span className="bld b3" />
                  <span className="lamp-post" />
                </div>
                <div className="rain heavy" />
              </>
            ) : (
              <>
                <span className="closing-folder">
                  <span className="folder-flap" />
                </span>
                <span className="closing-stamp">התיק נסגר</span>
              </>
            )}
          </div>
        )}
        <p className="clip-caption">{caption}</p>
      </div>
      <div className="clip-controls">
        <button type="button" className="btn ghost" onClick={togglePause}>
          {paused ? 'המשך' : 'עצור'}
        </button>
        <button type="button" className="btn primary" ref={closeRef} onClick={onClose}>
          דלג
        </button>
      </div>
    </div>
  )
}

export function SettingsDialog({ settings, onChange, onReset, onClose }: { settings: Settings; onChange: (s: Settings) => void; onReset: () => void; onClose: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  const toggle = (key: keyof Settings, label: string, desc: string) => {
    const on = key === 'theme' ? settings.theme === 'light' : !!settings[key]
    return (
      <label className="toggle">
        <input
          type="checkbox"
          checked={on}
          onChange={() => onChange(key === 'theme' ? { ...settings, theme: on ? 'dark' : 'light' } : { ...settings, [key]: !on })}
        />
        <span className="toggle-ui" aria-hidden="true" />
        <span>
          <b>{label}</b>
          <small>{desc}</small>
        </span>
      </label>
    )
  }
  return (
    <dialog ref={ref} className="settings" onClose={onClose} aria-labelledby="settings-title">
      <h2 id="settings-title">הגדרות</h2>
      {toggle('theme', 'תצוגה בהירה', 'רקע בהיר וטקסט כהה, לקריאה נוחה')}
      {toggle('reduceMotion', 'הפחתת תנועה', 'ללא גשם נע, ללא אנימציות וללא הפעלה אוטומטית של קליפים')}
      {toggle('sound', 'צלילי משוב', 'צליל קצר אחרי בדיקת תשובה. אינו נדרש להבנה')}
      {toggle('rain', 'גשם ברקע', 'רחש גשם שקט לאווירה')}
      {toggle('skipStory', 'דילוג על קטעי עלילה', 'מעבר ישיר להסבר ולמשימות')}
      <div className="danger-zone">
        <h3>איפוס התקדמות</h3>
        <p>ההתקדמות נשמרת רק במכשיר הזה. איפוס מוחק את כל התיקים, הפתקים והתוצאות.</p>
        {confirm ? (
          <div className="row">
            <button type="button" className="btn danger" onClick={onReset}>כן, לאפס הכול</button>
            <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>ביטול</button>
          </div>
        ) : (
          <button type="button" className="btn ghost" onClick={() => setConfirm(true)}>איפוס התקדמות</button>
        )}
      </div>
      <button type="button" className="btn primary" onClick={() => ref.current?.close()}>סגירה</button>
    </dialog>
  )
}
