import React, { useRef } from 'react'
import styles from './UploadZone.module.css'

export default function UploadZone({ id, label, sublabel, icon, dataUrl, onUpload }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onUpload(ev.target.result, file.name)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => onUpload(ev.target.result, file.name)
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e) => e.preventDefault()

  return (
    <div
      className={`${styles.zone} ${dataUrl ? styles.loaded : ''}`}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      aria-label={`Upload ${label}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {dataUrl ? (
        <div className={styles.loaded_inner}>
          <img src={dataUrl} className={styles.thumb} alt={`${label} preview`} />
          <div className={styles.loaded_info}>
            <span className={styles.loaded_label}>{label}</span>
            <span className={styles.loaded_status}>Loaded ✓  · click to replace</span>
          </div>
        </div>
      ) : (
        <div className={styles.empty_inner}>
          <div className={styles.icon}>{icon}</div>
          <div>
            <div className={styles.upload_label}>{label}</div>
            {sublabel && <div className={styles.upload_sub}>{sublabel}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
