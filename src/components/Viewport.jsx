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

      {!isRendered && (
        <div className={styles.empty}>
          <div className={styles.empty_disc}>⬤</div>
          <div className={styles.empty_title}>Your album lives here</div>
          <div className={styles.empty_sub}>Fill in the panel &amp; click Render Album</div>
        </div>
      )}

      {isRendered && (
        <div className={styles.controls_hint}>
          <span><strong>Drag</strong> rotate</span>
          <span className={styles.sep}>·</span>
          <span><strong>Right drag</strong> pan</span>
          <span className={styles.sep}>·</span>
          <span><strong>Scroll</strong> zoom</span>
          <span className={styles.sep}>·</span>
          <span><strong>Dbl-click</strong> reset</span>
        </div>
      )}

      {isRendered && (
        <div className={styles.view_controls}>
          {VIEW_BUTTONS.map(({ id, label }) => (
            <button key={id}
              className={`${styles.view_btn} ${activeView === id ? styles.active : ''}`}
              onClick={() => onSetView(id)}>
              {label}
            </button>
          ))}
          <div className={styles.divider_line} />
          <button
            className={`${styles.view_btn} ${isSpinning ? styles.active : ''}`}
            onClick={onToggleSpin}>
            {isSpinning ? '◼ Stop Spin' : '▶ Spin Record'}
          </button>
        </div>
      )}
    </div>
  )
}
