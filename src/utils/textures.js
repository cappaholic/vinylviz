import * as THREE from 'three'

export function dataUrlToTexture(dataUrl) {
  const tex = new THREE.TextureLoader().load(dataUrl)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = true
  return tex
}

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
  tex.flipY = true
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function drawVinylCanvas(img, { artist, albumTitle, vinylColor, isClear }) {
  const SIZE = 1024
  const cx = SIZE / 2, cy = SIZE / 2
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Base
  ctx.fillStyle = isClear ? 'rgba(180,210,230,0.15)' : (vinylColor || '#080808')
  ctx.beginPath(); ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2); ctx.fill()

  // Grooves
  const GS = 145, GE = 495, GC = 100
  for (let i = 0; i < GC; i++) {
    const r = GS + (i / GC) * (GE - GS)
    ctx.strokeStyle = isClear
      ? `rgba(255,255,255,${0.06 + (i % 3) * 0.03})`
      : `rgb(${10 + (i % 4 === 0 ? 9 : i % 2 === 0 ? 4 : 0)},${10 + (i % 4 === 0 ? 9 : i % 2 === 0 ? 4 : 0)},${10 + (i % 4 === 0 ? 9 : i % 2 === 0 ? 4 : 0)})`
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  }

  // Shimmer
  const sh = ctx.createRadialGradient(cx - 110, cy - 110, 10, cx, cy, 510)
  sh.addColorStop(0, 'rgba(255,255,255,0.06)')
  sh.addColorStop(0.4, 'rgba(255,255,255,0.01)')
  sh.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = sh
  ctx.beginPath(); ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2); ctx.fill()

  // Lead-in/out
  ctx.lineWidth = 3
  ctx.strokeStyle = isClear ? 'rgba(255,255,255,0.1)' : '#111'
  ctx.beginPath(); ctx.arc(cx, cy, GS - 5, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, GE + 5, 0, Math.PI * 2); ctx.stroke()

  // Label area
  const LR = 140
  ctx.fillStyle = isClear ? 'rgba(160,190,210,0.25)' : '#111'
  ctx.beginPath(); ctx.arc(cx, cy, LR, 0, Math.PI * 2); ctx.fill()

  if (img) {
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, LR - 2, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(img, cx - LR, cy - LR, LR * 2, LR * 2)
    ctx.restore()
  } else {
    const lg = ctx.createRadialGradient(cx - 28, cy - 28, 0, cx, cy, LR)
    lg.addColorStop(0,   isClear ? '#1a2a35' : '#2a1f0a')
    lg.addColorStop(0.6, isClear ? '#0e1820' : '#1a1205')
    lg.addColorStop(1,   isClear ? '#080e14' : '#0e0a03')
    ctx.fillStyle = lg
    ctx.beginPath(); ctx.arc(cx, cy, LR - 2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(200,169,110,0.28)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, LR - 8, 0, Math.PI * 2); ctx.stroke()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (artist) {
      ctx.fillStyle = '#c8a96e'
      ctx.font = `500 28px 'DM Serif Display', Georgia, serif`
      ctx.fillText(clip(ctx, artist, LR * 1.6), cx, cy - 16)
    }
    if (albumTitle) {
      ctx.fillStyle = '#7a7570'
      ctx.font = `300 18px 'DM Mono', monospace`
      ctx.fillText(clip(ctx, albumTitle, LR * 1.6), cx, cy + 16)
    }
  }

  // Spindle
  ctx.fillStyle = isClear ? 'rgba(0,0,0,0.5)' : '#000'
  ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = isClear ? 'rgba(255,255,255,0.15)' : '#1c1c1c'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke()

  return canvas
}

export async function generateVinylTextureAsync({ artist, albumTitle, labelDataUrl, vinylColor, isClear }) {
  const opts = { artist, albumTitle, vinylColor: vinylColor || '#080808', isClear: !!isClear }

  const finish = (canvas) => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    // Vinyl texture uses default flipY (true) — cylinder top face maps correctly
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
