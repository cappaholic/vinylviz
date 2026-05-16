import * as THREE from 'three'

/**
 * Load a data-URL into a Three.js texture.
 * flipY=false keeps the image correct on BoxGeometry faces.
 */
export function dataUrlToTexture(dataUrl) {
  const tex = new THREE.TextureLoader().load(dataUrl)
  tex.flipY = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Solid-colour fallback texture (tiny canvas).
 */
export function solidTexture(hex = '#1a1a1a') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 4
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, 4, 4)
  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = false
  return tex
}

/**
 * Wraps a user image with a thin dark border so white artwork
 * doesn't disappear against the white void background.
 */
export async function borderedImageTexture(dataUrl, borderColor = '#2a2a2a', borderWidth = 8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 1024
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      const ctx = canvas.getContext('2d')

      // Draw the image
      ctx.drawImage(img, 0, 0, SIZE, SIZE)

      // Thin inset border
      ctx.strokeStyle = borderColor
      ctx.lineWidth = borderWidth * 2
      ctx.strokeRect(0, 0, SIZE, SIZE)

      const tex = new THREE.CanvasTexture(canvas)
      tex.flipY = false
      tex.colorSpace = THREE.SRGBColorSpace
      resolve(tex)
    }
    img.onerror = () => resolve(dataUrlToTexture(dataUrl))
    img.src = dataUrl
  })
}

/**
 * Auto-generates a styled back-cover texture from metadata.
 */
export function generateBackCoverTexture({ artist, albumTitle, year, tracks }) {
  const SIZE = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Dark background
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Subtle grain
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * SIZE
    const y = Math.random() * SIZE
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.022})`
    ctx.fillRect(x, y, 1, 1)
  }

  const pad = 60

  ctx.fillStyle = '#c8a96e'
  ctx.fillRect(pad, pad, SIZE - pad * 2, 2)

  if (artist) {
    ctx.fillStyle = '#c8a96e'
    ctx.font = `500 52px 'DM Serif Display', Georgia, serif`
    ctx.textBaseline = 'top'
    ctx.fillText(clip(ctx, artist, SIZE - pad * 2), pad, pad + 18)
  }

  if (albumTitle) {
    ctx.fillStyle = '#7a7570'
    ctx.font = `300 32px 'DM Mono', monospace`
    ctx.textBaseline = 'top'
    ctx.fillText(clip(ctx, albumTitle, SIZE - pad * 2), pad, artist ? pad + 78 : pad + 18)
  }

  const trackStartY = (artist || albumTitle) ? pad + 160 : pad + 60
  ctx.fillStyle = 'rgba(200,169,110,0.18)'
  ctx.fillRect(pad, trackStartY - 18, SIZE - pad * 2, 1)

  if (tracks && tracks.length > 0) {
    ctx.textBaseline = 'top'
    tracks.forEach((title, i) => {
      const y = trackStartY + i * 44
      if (y > SIZE - pad - 44) return
      ctx.fillStyle = '#3a3530'
      ctx.font = `300 22px 'DM Mono', monospace`
      ctx.fillText(String(i + 1).padStart(2, '0'), pad, y)
      ctx.fillStyle = '#d0ccc8'
      ctx.font = `400 26px 'DM Mono', monospace`
      ctx.fillText(clip(ctx, title, SIZE - pad * 2 - 60), pad + 58, y)
    })
  }

  ctx.fillStyle = '#c8a96e'
  ctx.fillRect(pad, SIZE - pad - 2, SIZE - pad * 2, 2)

  if (year) {
    ctx.fillStyle = '#3a3530'
    ctx.font = `300 20px 'DM Mono', monospace`
    ctx.textBaseline = 'bottom'
    ctx.fillText(`© ${year}${artist ? '  ' + artist : ''}`, pad, SIZE - pad + 16)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Generates a vinyl disc texture respecting colour + clear options.
 * vinylColor: hex like '#1a0a2e' or 'clear'
 */
function drawVinylCanvas(img, { artist, albumTitle, vinylColor, isClear }) {
  const SIZE  = 1024
  const cx    = SIZE / 2
  const cy    = SIZE / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Base disc fill
  if (isClear) {
    // Transparent base — browser canvas doesn't truly support it in Three.js
    // so we use a very light tinted fill that the material opacity will handle
    ctx.fillStyle = 'rgba(180,210,230,0.15)'
  } else {
    ctx.fillStyle = vinylColor || '#080808'
  }
  ctx.beginPath()
  ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.fill()

  // Groove colour based on base
  const grooveLight = isClear ? 'rgba(255,255,255,0.18)' : null

  const GROOVE_START = 145
  const GROOVE_END   = 495
  const GROOVE_COUNT = 100
  for (let i = 0; i < GROOVE_COUNT; i++) {
    const t   = i / GROOVE_COUNT
    const r   = GROOVE_START + t * (GROOVE_END - GROOVE_START)
    if (isClear) {
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + (i % 3) * 0.03})`
    } else {
      // Relative brightness adjustment over the base colour
      const lum = 10 + (i % 4 === 0 ? 9 : i % 2 === 0 ? 4 : 0)
      ctx.strokeStyle = `rgb(${lum},${lum},${lum})`
    }
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Shimmer highlight
  const shimmer = ctx.createRadialGradient(cx - 110, cy - 110, 10, cx, cy, 510)
  shimmer.addColorStop(0,   'rgba(255,255,255,0.06)')
  shimmer.addColorStop(0.4, 'rgba(255,255,255,0.01)')
  shimmer.addColorStop(1,   'rgba(0,0,0,0)')
  ctx.fillStyle = shimmer
  ctx.beginPath()
  ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.fill()

  // Lead-in/run-out gap rings
  ctx.lineWidth = 3
  ctx.strokeStyle = isClear ? 'rgba(255,255,255,0.1)' : '#111'
  ctx.beginPath(); ctx.arc(cx, cy, GROOVE_START - 5, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, GROOVE_END   + 5, 0, Math.PI * 2); ctx.stroke()

  // Label area
  const labelR = 140
  ctx.fillStyle = isClear ? 'rgba(160,190,210,0.25)' : '#111'
  ctx.beginPath()
  ctx.arc(cx, cy, labelR, 0, Math.PI * 2)
  ctx.fill()

  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, labelR - 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, cx - labelR, cy - labelR, labelR * 2, labelR * 2)
    ctx.restore()
  } else {
    const lgr = ctx.createRadialGradient(cx - 28, cy - 28, 0, cx, cy, labelR)
    lgr.addColorStop(0,   isClear ? '#1a2a35' : '#2a1f0a')
    lgr.addColorStop(0.6, isClear ? '#0e1820' : '#1a1205')
    lgr.addColorStop(1,   isClear ? '#080e14' : '#0e0a03')
    ctx.fillStyle = lgr
    ctx.beginPath()
    ctx.arc(cx, cy, labelR - 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(200,169,110,0.28)'
    ctx.lineWidth   = 2
    ctx.beginPath(); ctx.arc(cx, cy, labelR - 8, 0, Math.PI * 2); ctx.stroke()

    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    if (artist) {
      ctx.fillStyle = '#c8a96e'
      ctx.font      = `500 28px 'DM Serif Display', Georgia, serif`
      ctx.fillText(clip(ctx, artist, labelR * 1.6), cx, cy - 16)
    }
    if (albumTitle) {
      ctx.fillStyle = '#7a7570'
      ctx.font      = `300 18px 'DM Mono', monospace`
      ctx.fillText(clip(ctx, albumTitle, labelR * 1.6), cx, cy + 16)
    }
  }

  // Spindle hole
  ctx.fillStyle = isClear ? 'rgba(0,0,0,0.5)' : '#000'
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = isClear ? 'rgba(255,255,255,0.15)' : '#1c1c1c'
  ctx.lineWidth   = 1.5
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke()

  return canvas
}

/**
 * Async vinyl texture — waits for label image to load before drawing.
 */
export async function generateVinylTextureAsync({ artist, albumTitle, labelDataUrl, vinylColor, isClear }) {
  const opts = { artist, albumTitle, vinylColor: vinylColor || '#080808', isClear: !!isClear }

  if (!labelDataUrl) {
    const canvas = drawVinylCanvas(null, opts)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = drawVinylCanvas(img, opts)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      resolve(tex)
    }
    img.onerror = () => {
      const canvas = drawVinylCanvas(null, opts)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      resolve(tex)
    }
    img.src = labelDataUrl
  })
}

function clip(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}
