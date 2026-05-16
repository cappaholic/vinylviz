import React from 'react'
import styles from './Viewport.module.css'

const VIEW_BUTTONS = [
  { id: 'perspective', label: '3D View' },
  { id: 'front',       label: 'Front Cover' },
  { id: 'back',        label: 'Back Cover' },
  { id: 'record',      label: 'Vinyl Record' },
  { id: 'top',         label: 'Top Down' },
]

export default function Viewport({ canvasRef, isRendered, activeView, onSetView, isSpinning, onToggleSpin }) {
  return (
    <div className={styles.viewport}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Empty state */}
      {!isRendered && (
        <div className={styles.empty}>
          <div className={styles.empty_disc}>⬤</div>
          <div className={styles.empty_title}>Your album lives here</div>
          <div className={styles.empty_sub}>Upload artwork &amp; click Render Album</div>
        </div>
      )}

      {/* Controls hint */}
      {isRendered && (
        <div className={styles.controls_hint}>
          <span><strong>Drag</strong> to rotate</span>
          <span className={styles.divider}>·</span>
          <span><strong>Right drag</strong> to pan</span>
          <span className={styles.divider}>·</span>
          <span><strong>Scroll</strong> to zoom</span>
          <span className={styles.divider}>·</span>
          <span><strong>Dbl-click</strong> to reset</span>
        </div>
      )}

      {/* View controls */}
      {isRendered && (
        <div className={styles.view_controls}>
          {VIEW_BUTTONS.map(({ id, label }) => (
            <button
              key={id}
              className={`${styles.view_btn} ${activeView === id ? styles.active : ''}`}
              onClick={() => onSetView(id)}
            >
              {label}
            </button>
          ))}
          <div className={styles.divider_line} />
          <button
            className={`${styles.view_btn} ${isSpinning ? styles.active : ''}`}
            onClick={onToggleSpin}
          >
            {isSpinning ? '◼ Stop Spin' : '▶ Spin Record'}
          </button>
        </div>
      )}
    </div>
  )
}
