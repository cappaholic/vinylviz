import * as THREE from 'three'

export function solidTexture(hex = '#1a1a1a') {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 4
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, 4, 4)
  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = true
  return tex
}

export function generateBackCoverTexture({ artist, albumTitle, year, tracks }) {
  const SIZE = 1024
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, 0, SIZE, SIZE)

  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.022})`
    ctx.fillRect(Math.random() * SIZE, Math.random() * SIZE, 1, 1)
  }

  const pad = 60
  ctx.fillStyle = '#c8a96e'
  ctx.fillRect(pad, pad, SIZE - pad * 2, 2)

  if (artist) {
    ctx.fillStyle = '#c8a96e'
    ctx.font = `500 52px Georgia, serif`
    ctx.textBaseline = 'top'
    ctx.fillText(clip(ctx, artist, SIZE - pad * 2), pad, pad + 18)
  }
  if (albumTitle) {
    ctx.fillStyle = '#7a7570'
    ctx.font = `300 32px monospace`
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
      ctx.font = `300 22px monospace`
      ctx.fillText(String(i + 1).padStart(2, '0'), pad, y)
      ctx.fillStyle = '#d0ccc8'
      ctx.font = `400 26px monospace`
      ctx.fillText(clip(ctx, title, SIZE - pad * 2 - 60), pad + 58, y)
    })
  }

  ctx.fillStyle = '#c8a96e'
  ctx.fillRect(pad, SIZE - pad - 2, SIZE - pad * 2, 2)

  if (year) {
    ctx.fillStyle = '#3a3530'
    ctx.font = `300 20px monospace`
    ctx.textBaseline = 'bottom'
    ctx.fillText(`© ${year}${artist ? '  ' + artist : ''}`, pad, SIZE - pad + 16)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = true
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Draws the vinyl texture onto a 1024×1024 canvas.
 * This texture is mapped onto RingGeometry (for the top and bottom faces),
 * which uses UV coordinates from 0→1 across the ring.
 *
 * RingGeometry UV: (0,0) = inner edge, (1,1) = outer edge — mapped radially.
 * So we draw the full disc including the label in the center, and let the
 * RingGeometry's UV naturally map the ring area (label at center, grooves outward).
 *
 * The texture is drawn as a full circle with the hole left clear
 * (the geometry itself creates the hole — we just draw the full disc design).
 */
function drawVinylCanvas(img, { artist, albumTitle, vinylColor, isClear }) {
  const SIZE = 1024
  const cx   = SIZE / 2
  const cy   = SIZE / 2
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // ── Parse the vinyl colour for groove rendering ───────────────────────────
  // We draw grooves in the actual vinyl colour so it looks correct at any opacity
  const baseHex = isClear ? '#99bbcc' : (vinylColor || '#080808')

  // Helper: parse hex to rgb components 0-255
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '')
    const full = h.length === 3
      ? h.split('').map(c => parseInt(c + c, 16))
      : [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
    return full
  }
  const [br, bg, bb] = isClear ? [153, 187, 204] : hexToRgb(baseHex)

  // Lighten: add white
  const lighten = (amount) =>
    `rgb(${Math.round(Math.min(255, br + amount))},${Math.round(Math.min(255, bg + amount))},${Math.round(Math.min(255, bb + amount))})`
  // Darken: subtract
  const darken = (amount) =>
    `rgb(${Math.round(Math.max(0, br - amount))},${Math.round(Math.max(0, bg - amount))},${Math.round(Math.max(0, bb - amount))})`

  // ── Base disc fill ────────────────────────────────────────────────────────
  ctx.fillStyle = baseHex
  ctx.beginPath()
  ctx.arc(cx, cy, SIZE / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  // ── Groove track lines ────────────────────────────────────────────────────
  const R_MAX   = SIZE / 2 - 2
  const GS      = R_MAX * 0.30
  const GE      = R_MAX * 0.94
  const GROOVES = 120

  for (let i = 0; i < GROOVES; i++) {
    const t = i / GROOVES
    const r = GS + t * (GE - GS)

    if (i % 5 === 0) {
      ctx.strokeStyle = lighten(46)   // track gap — lighter
      ctx.lineWidth   = 2.2
    } else if (i % 2 === 0) {
      ctx.strokeStyle = lighten(20)   // groove wall
      ctx.lineWidth   = 1.2
    } else {
      ctx.strokeStyle = darken(16)    // groove valley
      ctx.lineWidth   = 1.2
    }
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // ── Radial shimmer sheen ──────────────────────────────────────────────────
  const shimmer = ctx.createRadialGradient(cx - 100, cy - 120, 20, cx, cy, R_MAX)
  shimmer.addColorStop(0,    'rgba(255,255,255,0.10)')
  shimmer.addColorStop(0.35, 'rgba(255,255,255,0.04)')
  shimmer.addColorStop(0.65, 'rgba(255,255,255,0.02)')
  shimmer.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.fillStyle = shimmer
  ctx.beginPath()
  ctx.arc(cx, cy, R_MAX, 0, Math.PI * 2)
  ctx.fill()

  // ── Lead-in / run-out silent grooves ─────────────────────────────────────
  ctx.lineWidth   = 3.5
  ctx.strokeStyle = lighten(56)
  ctx.beginPath(); ctx.arc(cx, cy, GS - 6, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, GE + 6, 0, Math.PI * 2); ctx.stroke()

  // ── Label area — just a dark circle placeholder (label rendered separately) ─
  const LR = R_MAX * 0.285
  ctx.fillStyle = '#111111'
  ctx.beginPath()
  ctx.arc(cx, cy, LR, 0, Math.PI * 2)
  ctx.fill()

  // ── Centre spindle hole marker ────────────────────────────────────────────
  const holeR = R_MAX * 0.03
  ctx.fillStyle = '#000000'
  ctx.beginPath(); ctx.arc(cx, cy, holeR + 2, 0, Math.PI * 2); ctx.fill()

  return canvas
}

/**
 * Generates a solid label texture (always 100% opaque).
 * Used on a separate mesh above the transparent vinyl disc.
 */
function drawLabelCanvas(img, { artist, albumTitle }) {
  const SIZE = 512
  const cx = SIZE / 2, cy = SIZE / 2, R = SIZE / 2 - 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  if (img) {
    // Draw user label image, centre-cropped into a circle
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip()
    const iw = img.width, ih = img.height
    const minDim = Math.min(iw, ih)
    const sx = (iw - minDim) / 2, sy = (ih - minDim) / 2
    ctx.drawImage(img, sx, sy, minDim, minDim, cx - R, cy - R, R * 2, R * 2)
    ctx.restore()
  } else {
    // Styled default label
    const lg = ctx.createRadialGradient(cx - 24, cy - 24, 0, cx, cy, R)
    lg.addColorStop(0,   '#2a1f0a')
    lg.addColorStop(0.6, '#1a1205')
    lg.addColorStop(1,   '#0e0a03')
    ctx.fillStyle = lg
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()

    ctx.strokeStyle = 'rgba(200,169,110,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, R - 12, 0, Math.PI * 2); ctx.stroke()

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (artist) {
      ctx.fillStyle = '#c8a96e'
      ctx.font = `bold 52px Georgia, serif`
      ctx.fillText(clip(ctx, artist, R * 1.7), cx, cy - 24)
    }
    if (albumTitle) {
      ctx.fillStyle = '#7a7570'
      ctx.font = `300 32px monospace`
      ctx.fillText(clip(ctx, albumTitle, R * 1.7), cx, cy + 28)
    }
  }

  // Spindle hole
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.055, 0, Math.PI * 2); ctx.fill()

  return canvas
}

export async function generateLabelTextureAsync({ artist, albumTitle, labelDataUrl }) {
  const opts = { artist, albumTitle }
  const finish = (canvas) => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false
    return tex
  }
  if (!labelDataUrl) return finish(drawLabelCanvas(null, opts))
  return new Promise((resolve) => {
    const img = new Image()
    img.onload  = () => resolve(finish(drawLabelCanvas(img, opts)))
    img.onerror = () => resolve(finish(drawLabelCanvas(null, opts)))
    img.src = labelDataUrl
  })
}

export async function generateVinylTextureAsync({ vinylColor, isClear }) {
  const opts = { artist: '', albumTitle: '', vinylColor: vinylColor || '#080808', isClear: !!isClear }
  const finish = (canvas) => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = false
    return tex
  }
  return finish(drawVinylCanvas(null, opts))
}

function clip(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}
