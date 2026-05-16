import React from 'react'
import UploadZone from './UploadZone.jsx'
import styles from './Sidebar.module.css'

const VINYL_PRESETS = [
  { label: 'Black',       value: '#080808' },
  { label: 'Clear',       value: 'clear'   },
  { label: 'White',       value: '#e8e8e8' },
  { label: 'Red',         value: '#8b0000' },
  { label: 'Blue',        value: '#0a1a6e' },
  { label: 'Green',       value: '#0a4a1a' },
  { label: 'Purple',      value: '#3a0a6e' },
  { label: 'Gold',        value: '#8b6914' },
  { label: 'Pink',        value: '#8b2252' },
  { label: 'Orange',      value: '#8b3a00' },
  { label: 'Custom',      value: 'custom'  },
]

function SectionLabel({ children }) {
  return <div className={styles.section_label}>{children}</div>
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.field_label}>{label}</label>
      {children}
    </div>
  )
}

export default function Sidebar({
  images, meta, tracks,
  onImageUpload, onMetaChange, onTracksChange,
  onRender, isRendering,
}) {
  const isBook = meta.sleeveStyle === 'book'
  const vinylColor = meta.vinylColor || '#080808'
  const isCustom = !VINYL_PRESETS.find(p => p.value === vinylColor && p.value !== 'custom')
    || vinylColor === 'custom'

  const addTrack = () => {
    if (tracks.length >= 20) return
    onTracksChange([...tracks, ''])
  }
  const updateTrack = (i, val) => {
    const next = [...tracks]; next[i] = val; onTracksChange(next)
  }
  const removeTrack = (i) => {
    if (tracks.length <= 1) return
    onTracksChange(tracks.filter((_, idx) => idx !== i))
  }

  const handleVinylPreset = (val) => {
    if (val === 'custom') return // let the color input handle it
    onMetaChange('vinylColor', val)
  }

  const selectedPreset = VINYL_PRESETS.find(p => p.value === vinylColor)?.value || 'custom'

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>VinylViz<span className={styles.logo_dot}>.</span></div>
        <div className={styles.tagline}>Album Art Visualizer</div>
      </div>

      <div className={styles.scroll}>

        {/* ── Sleeve Style ── */}
        <section className={styles.section}>
          <SectionLabel>Sleeve Style</SectionLabel>
          <div className={styles.toggle_row}>
            <button
              className={`${styles.toggle_btn} ${!isBook ? styles.toggle_active : ''}`}
              onClick={() => onMetaChange('sleeveStyle', 'standard')}
            >
              Standard
            </button>
            <button
              className={`${styles.toggle_btn} ${isBook ? styles.toggle_active : ''}`}
              onClick={() => onMetaChange('sleeveStyle', 'book')}
            >
              Book / Gatefold
            </button>
          </div>
          {isBook && (
            <p className={styles.hint_text}>
              Gatefold opens like a book — left &amp; right inner sleeves visible when open.
            </p>
          )}
        </section>

        {/* ── Artwork uploads ── */}
        <section className={styles.section}>
          <SectionLabel>Artwork</SectionLabel>

          <UploadZone
            id="front" label="Front Cover" sublabel="Main album artwork" icon="↑"
            dataUrl={images.front} onUpload={(url) => onImageUpload('front', url)}
          />
          <UploadZone
            id="back" label="Back Cover" sublabel="Auto-generated if skipped" icon="↑"
            dataUrl={images.back} onUpload={(url) => onImageUpload('back', url)}
          />

          {isBook ? (
            <>
              <UploadZone
                id="innerLeft" label="Inner Left Sleeve" sublabel="Left panel artwork (book open)" icon="↑"
                dataUrl={images.innerLeft} onUpload={(url) => onImageUpload('innerLeft', url)}
              />
              <UploadZone
                id="innerRight" label="Inner Right Sleeve" sublabel="Right panel artwork (book open)" icon="↑"
                dataUrl={images.innerRight} onUpload={(url) => onImageUpload('innerRight', url)}
              />
            </>
          ) : (
            <UploadZone
              id="inner" label="Inner Sleeve" sublabel="Optional inner artwork" icon="↑"
              dataUrl={images.inner} onUpload={(url) => onImageUpload('inner', url)}
            />
          )}

          <UploadZone
            id="label" label="Record Label Sticker" sublabel="Centre sticker — auto-generated if skipped" icon="◎"
            dataUrl={images.label} onUpload={(url) => onImageUpload('label', url)}
          />
        </section>

        {/* ── Vinyl Color ── */}
        <section className={styles.section}>
          <SectionLabel>Vinyl Colour</SectionLabel>
          <div className={styles.vinyl_presets}>
            {VINYL_PRESETS.map(({ label, value }) => {
              const isActive = value === 'custom'
                ? !VINYL_PRESETS.slice(0, -1).find(p => p.value === vinylColor)
                : value === vinylColor
              return (
                <button
                  key={value}
                  className={`${styles.vinyl_chip} ${isActive ? styles.chip_active : ''}`}
                  onClick={() => handleVinylPreset(value)}
                  title={label}
                  style={value !== 'clear' && value !== 'custom'
                    ? { background: value, borderColor: isActive ? '#fff' : 'transparent' }
                    : {}}
                >
                  {value === 'clear' && <span className={styles.chip_clear}>✦</span>}
                  {value === 'custom' && <span className={styles.chip_custom}>+</span>}
                  <span className={styles.chip_label}>{label}</span>
                </button>
              )
            })}
          </div>

          {/* Custom hex / color picker */}
          <div className={styles.custom_color_row}>
            <input
              type="color"
              className={styles.color_picker}
              value={vinylColor === 'clear' || vinylColor === 'custom' ? '#080808' : vinylColor}
              onChange={(e) => onMetaChange('vinylColor', e.target.value)}
              title="Pick a custom colour"
            />
            <input
              type="text"
              className={styles.input}
              placeholder="#080808 or pick above"
              value={vinylColor === 'clear' ? 'clear' : vinylColor}
              onChange={(e) => {
                const v = e.target.value.trim()
                if (v === 'clear' || v.match(/^#[0-9a-fA-F]{0,6}$/)) {
                  onMetaChange('vinylColor', v)
                }
              }}
              style={{ flex: 1 }}
            />
          </div>
          <p className={styles.hint_text}>Clear vinyl renders with partial transparency.</p>
        </section>

        {/* ── Album Info ── */}
        <section className={styles.section}>
          <SectionLabel>Album Info</SectionLabel>
          <Field label="Artist / Band Name">
            <input className={styles.input} type="text" placeholder="Your name or band name"
              value={meta.artist} onChange={(e) => onMetaChange('artist', e.target.value)} />
          </Field>
          <Field label="Album Title">
            <input className={styles.input} type="text" placeholder="Album title"
              value={meta.albumTitle} onChange={(e) => onMetaChange('albumTitle', e.target.value)} />
          </Field>
          <Field label="Year">
            <input className={styles.input} type="text" placeholder="2025" maxLength={4}
              style={{ width: 72 }} value={meta.year}
              onChange={(e) => onMetaChange('year', e.target.value)} />
          </Field>
        </section>

        {/* ── Track Listing ── */}
        <section className={styles.section}>
          <SectionLabel>Track Listing <span className={styles.optional}>(optional)</span></SectionLabel>
          <div className={styles.tracks}>
            {tracks.map((title, i) => (
              <div key={i} className={styles.track_row}>
                <span className={styles.track_num}>{String(i + 1).padStart(2, '0')}</span>
                <input className={styles.track_input} type="text" placeholder="Track title"
                  value={title} onChange={(e) => updateTrack(i, e.target.value)} />
                <button className={styles.remove_btn} onClick={() => removeTrack(i)}
                  title="Remove" aria-label="Remove track">×</button>
              </div>
            ))}
          </div>
          {tracks.length < 20 && (
            <button className={styles.add_track_btn} onClick={addTrack}>+ Add Track</button>
          )}
        </section>

        {/* ── Coming Soon ── */}
        <section className={styles.section}>
          <SectionLabel>Format <span className={styles.coming_soon}>Coming Soon</span></SectionLabel>
          <div className={styles.formats}>
            {[{ icon: '💿', label: 'CD' }, { icon: '📼', label: 'Cassette' }, { icon: '🔊', label: 'Audio' }].map(f => (
              <div key={f.label} className={styles.format_item}>
                <div className={styles.format_icon}>{f.icon}</div>
                <div className={styles.format_label}>{f.label}</div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <div className={styles.footer}>
        <button className={styles.render_btn} onClick={onRender} disabled={isRendering}>
          {isRendering ? '⟳ Building…' : '▶ Render Album'}
        </button>
      </div>
    </aside>
  )
}
