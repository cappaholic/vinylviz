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

  // ── Base disc colour ──────────────────────────────────────────────────────
  const baseColor = isClear ? 'rgba(180,210,230,0.2)' : (vinylColor || '#080808')
  ctx.fillStyle = baseColor
  ctx.beginPath()
  ctx.arc(cx, cy, SIZE / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  // ── Groove track lines ────────────────────────────────────────────────────
  // Real vinyl: ~200-300 grooves. We render 120 for visibility at this resolution.
  // Groove area: from label edge (~28% r) to run-out edge (~95% r)
  const R_MAX    = SIZE / 2 - 2
  const GS       = R_MAX * 0.30   // groove start radius (px)
  const GE       = R_MAX * 0.94   // groove end radius
  const GROOVES  = 120

  for (let i = 0; i < GROOVES; i++) {
    const t = i / GROOVES
    const r = GS + t * (GE - GS)

    // Alternate between slightly lighter and darker rings for the groove illusion
    let lum, alpha
    if (isClear) {
      alpha = 0.05 + (i % 4 === 0 ? 0.10 : i % 2 === 0 ? 0.06 : 0.03)
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`
    } else {
      // Grooves appear slightly lighter than the base vinyl colour
      // Every 5th groove is brighter (simulates groups of tracks)
      if (i % 5 === 0) {
        lum = 38   // brighter — track gap
      } else if (i % 2 === 0) {
        lum = 22   // mid groove
      } else {
        lum = 12   // dark groove valley
      }
      ctx.strokeStyle = `rgb(${lum},${lum},${lum})`
    }

    ctx.lineWidth = i % 5 === 0 ? 2.2 : 1.2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // ── Radial shimmer (subtle rainbow sheen) ────────────────────────────────
  const shimmer = ctx.createRadialGradient(cx - 100, cy - 120, 20, cx, cy, R_MAX)
  shimmer.addColorStop(0,    'rgba(255,255,255,0.07)')
  shimmer.addColorStop(0.35, 'rgba(255,255,200,0.03)')
  shimmer.addColorStop(0.65, 'rgba(200,200,255,0.03)')
  shimmer.addColorStop(1,    'rgba(0,0,0,0)')
  ctx.fillStyle = shimmer
  ctx.beginPath()
  ctx.arc(cx, cy, R_MAX, 0, Math.PI * 2)
  ctx.fill()

  // ── Lead-in / run-out silent grooves (slightly brighter gap rings) ────────
  ctx.lineWidth = 3.5
  ctx.strokeStyle = isClear ? 'rgba(255,255,255,0.14)' : 'rgba(80,80,80,0.9)'
  ctx.beginPath(); ctx.arc(cx, cy, GS - 6, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, GE + 6, 0, Math.PI * 2); ctx.stroke()

  // ── Label area ────────────────────────────────────────────────────────────
  const LR = R_MAX * 0.285  // label radius ≈ same proportion as real vinyl
  ctx.fillStyle = isClear ? 'rgba(140,170,190,0.3)' : '#111'
  ctx.beginPath()
  ctx.arc(cx, cy, LR, 0, Math.PI * 2)
  ctx.fill()

  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, LR - 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, cx - LR, cy - LR, LR * 2, LR * 2)
    ctx.restore()
  } else {
    // Default styled label
    const lg = ctx.createRadialGradient(cx - 24, cy - 24, 0, cx, cy, LR)
    lg.addColorStop(0,   isClear ? '#1a2a35' : '#2a1f0a')
    lg.addColorStop(0.6, isClear ? '#0e1820' : '#1a1205')
    lg.addColorStop(1,   isClear ? '#080e14' : '#0e0a03')
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.arc(cx, cy, LR - 2, 0, Math.PI * 2)
    ctx.fill()

    // Label ring line
    ctx.strokeStyle = 'rgba(200,169,110,0.3)'
    ctx.lineWidth   = 2
    ctx.beginPath(); ctx.arc(cx, cy, LR - 10, 0, Math.PI * 2); ctx.stroke()

    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    if (artist) {
      ctx.fillStyle = '#c8a96e'
      ctx.font      = `bold 26px Georgia, serif`
      ctx.fillText(clip(ctx, artist, LR * 1.7), cx, cy - 14)
    }
    if (albumTitle) {
      ctx.fillStyle = '#7a7570'
      ctx.font      = `300 17px monospace`
      ctx.fillText(clip(ctx, albumTitle, LR * 1.7), cx, cy + 14)
    }
  }

  // ── Centre spindle hole marker ────────────────────────────────────────────
  // The actual geometry hole is cut by RingGeometry.
  // We draw a dark fill here so the hole looks dark, not showing through the base.
  const holeR = R_MAX * 0.03   // ~proportional to real 0.286" hole on 12" disc
  ctx.fillStyle = '#000'
  ctx.beginPath(); ctx.arc(cx, cy, holeR + 2, 0, Math.PI * 2); ctx.fill()

  return canvas
}

export async function generateVinylTextureAsync({ artist, albumTitle, labelDataUrl, vinylColor, isClear }) {
  const opts = { artist, albumTitle, vinylColor: vinylColor || '#080808', isClear: !!isClear }

  const finish = (canvas) => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  if (!labelDataUrl) return finish(drawVinylCanvas(null, opts))

  return new Promise((resolve) => {
    const img = new Image()
    img.onload  = () => resolve(finish(drawVinylCanvas(img, opts)))
    img.onerror = () => resolve(finish(drawVinylCanvas(null, opts)))
    img.src = labelDataUrl
  })
}

function clip(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}
