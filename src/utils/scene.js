import * as THREE from 'three'
import { dataUrlToTexture, solidTexture, generateBackCoverTexture, generateVinylTextureAsync } from './textures.js'

/**
 * Builds the full album scene.
 * meta: { artist, albumTitle, year, tracks, sleeveStyle, vinylColor }
 * sleeveStyle: 'standard' | 'book'
 * vinylColor: hex string e.g. '#1a0a2e' or 'clear'
 */
export async function buildAlbumScene(scene, images, meta) {
  // Remove previous album group cleanly
  const existing = scene.getObjectByName('albumGroup')
  if (existing) {
    existing.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose() })
      }
    })
    scene.remove(existing)
  }

  const group = new THREE.Group()
  group.name = 'albumGroup'
  scene.add(group)

  const isBook   = meta.sleeveStyle === 'book'
  const vinylColor = meta.vinylColor || '#080808'
  const isClear  = vinylColor === 'clear'

  // ─── Textures ─────────────────────────────────────────────────────────────
  const frontTex = images.front
    ? dataUrlToTexture(images.front)
    : solidTexture('#1c1c1c')

  const backTex = images.back
    ? dataUrlToTexture(images.back)
    : generateBackCoverTexture({
        artist: meta.artist,
        albumTitle: meta.albumTitle,
        year: meta.year,
        tracks: meta.tracks,
      })

  const innerLeftTex  = images.innerLeft  ? dataUrlToTexture(images.innerLeft)  : solidTexture('#181818')
  const innerRightTex = images.innerRight ? dataUrlToTexture(images.innerRight) : solidTexture('#1a1a1a')
  const innerTex      = images.inner      ? dataUrlToTexture(images.inner)      : solidTexture('#181818')

  const vinylTex = await generateVinylTextureAsync({
    artist:       meta.artist,
    albumTitle:   meta.albumTitle,
    labelDataUrl: images.label || null,
    vinylColor,
    isClear,
  })

  // ─── Sleeve geometry ──────────────────────────────────────────────────────
  const SZ = 3.1   // sleeve width & height (square)
  const ST = 0.072 // sleeve thickness

  // Helper — fresh edge material each call to avoid shared-material issues
  const edgeMat = () => new THREE.MeshStandardMaterial({
    color: 0x1a1714,
    roughness: 0.92,
    metalness: 0.0,
  })

  const frontMat = new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.72, metalness: 0.02 })
  const backMat  = new THREE.MeshStandardMaterial({ map: backTex,  roughness: 0.72, metalness: 0.02 })

  if (isBook) {
    // ── Gatefold / book style: two hinged panels ──
    const halfW   = SZ / 2
    const panelGeo = new THREE.BoxGeometry(halfW, SZ, ST)

    // Left panel: outside = back cover, inside = inner-left
    const lInMat  = new THREE.MeshStandardMaterial({ map: innerLeftTex, roughness: 0.82 })
    const lOutMat = new THREE.MeshStandardMaterial({ map: backTex,      roughness: 0.72, metalness: 0.02 })
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z(front/inside), -Z(back/outside)
    const leftPanel = new THREE.Mesh(panelGeo, [edgeMat(), edgeMat(), edgeMat(), edgeMat(), lInMat, lOutMat])
    leftPanel.position.x = -halfW / 2
    leftPanel.castShadow = true
    leftPanel.receiveShadow = true
    group.add(leftPanel)

    // Right panel: outside = front cover, inside = inner-right
    const rInMat  = new THREE.MeshStandardMaterial({ map: innerRightTex, roughness: 0.82 })
    const rOutMat = new THREE.MeshStandardMaterial({ map: frontTex,       roughness: 0.72, metalness: 0.02 })
    const rightPanel = new THREE.Mesh(panelGeo, [edgeMat(), edgeMat(), edgeMat(), edgeMat(), rInMat, rOutMat])
    rightPanel.position.x = halfW / 2
    rightPanel.castShadow = true
    rightPanel.receiveShadow = true
    group.add(rightPanel)

    // Spine strip between panels
    const spineGeo  = new THREE.BoxGeometry(0.045, SZ, ST)
    const spineMesh = new THREE.Mesh(spineGeo, edgeMat())
    group.add(spineMesh)

  } else {
    // ── Standard single sleeve ──
    const sleeveGeo = new THREE.BoxGeometry(SZ, SZ, ST)
    const sleeve    = new THREE.Mesh(sleeveGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(), frontMat, backMat,
    ])
    sleeve.name = 'sleeve'
    sleeve.castShadow = true
    sleeve.receiveShadow = true
    group.add(sleeve)

    // Inner sleeve peeking slightly above the top edge
    const iMat    = new THREE.MeshStandardMaterial({ map: innerTex, roughness: 0.85 })
    const innerGeo = new THREE.BoxGeometry(SZ * 0.92, SZ * 0.92, ST * 0.5)
    const inner    = new THREE.Mesh(innerGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(), iMat, iMat,
    ])
    inner.position.set(0, 0.1, 0.014)
    inner.castShadow = true
    group.add(inner)
  }

  // ─── Vinyl record — flat & horizontal, below sleeve, auto-spinning ────────
  const VINYL_R = 1.45
  const VINYL_T = 0.034

  const vThreeColor = new THREE.Color(isClear ? 0x99bbcc : vinylColor)

  // Top face: groove texture. Bottom and edge: tinted solid.
  const vinylTopMat = new THREE.MeshStandardMaterial({
    map:       vinylTex,
    roughness: 0.12,
    metalness: 0.88,
    ...(isClear ? { transparent: true, opacity: 0.42, color: new THREE.Color(0xbbddee) } : {}),
  })
  const vinylBotMat = new THREE.MeshStandardMaterial({
    color:     vThreeColor,
    roughness: 0.18,
    metalness: 0.82,
    ...(isClear ? { transparent: true, opacity: 0.32 } : {}),
  })
  const vinylEdgeMat = new THREE.MeshStandardMaterial({
    color:     vThreeColor,
    roughness: 0.22,
    metalness: 0.65,
    ...(isClear ? { transparent: true, opacity: 0.36 } : {}),
  })

  // CylinderGeometry material slots: [side/edge, top+Y, bottom-Y]
  const vinylGeo  = new THREE.CylinderGeometry(VINYL_R, VINYL_R, VINYL_T, 128, 1, false)
  const vinylDisc = new THREE.Mesh(vinylGeo, [vinylEdgeMat, vinylTopMat, vinylBotMat])
  vinylDisc.name = 'vinylDisc'
  vinylDisc.castShadow = true
  vinylDisc.receiveShadow = true

  // Bevel rings — same material as edge, prevents visible top/bottom seam line
  const bevelGeo = new THREE.TorusGeometry(VINYL_R - 0.003, 0.006, 12, 128)
  const bTop = new THREE.Mesh(bevelGeo, vinylEdgeMat)
  bTop.position.y  =  VINYL_T / 2
  const bBot = new THREE.Mesh(bevelGeo, vinylEdgeMat)
  bBot.position.y  = -VINYL_T / 2

  const recordGroup = new THREE.Group()
  recordGroup.name  = 'recordGroup'
  recordGroup.add(vinylDisc, bTop, bBot)

  // Flat layout: record sits below the sleeve, centered horizontally
  // Cylinder default is already horizontal (Y-up), so no rotation needed
  const sleeveBottom = -SZ / 2
  recordGroup.position.set(0, sleeveBottom - VINYL_R * 0.6, 0.1)

  group.add(recordGroup)

  // ─── Soft ground shadow ───────────────────────────────────────────────────
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.ShadowMaterial({ opacity: 0.10 }),
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = sleeveBottom - VINYL_R * 1.15
  shadowPlane.receiveShadow = true
  group.add(shadowPlane)

  // Natural starting tilt
  group.rotation.x = -0.16
  group.rotation.y =  0.22

  return { group, recordGroup, vinylDisc }
}

/**
 * Set up scene lighting and background.
 * White void = white background + soft neutral lighting.
 */
export function setupLights(scene) {
  // White void background
  scene.background = new THREE.Color(0xffffff)
  scene.fog = null

  // Remove any stale lights
  const toRemove = []
  scene.traverse(obj => { if (obj.isLight) toRemove.push(obj) })
  toRemove.forEach(l => scene.remove(l))

  // Bright ambient so the white bg reads cleanly
  scene.add(new THREE.AmbientLight(0xffffff, 0.7))

  // Main key light (slightly warm, top-right-front)
  const key = new THREE.DirectionalLight(0xfff8f0, 1.6)
  key.position.set(5, 9, 6)
  key.castShadow = true
  key.shadow.mapSize.width  = 2048
  key.shadow.mapSize.height = 2048
  key.shadow.camera.near   = 0.5
  key.shadow.camera.far    = 50
  key.shadow.camera.left   = -8
  key.shadow.camera.right  =  8
  key.shadow.camera.top    =  8
  key.shadow.camera.bottom = -8
  key.shadow.bias = -0.0004
  scene.add(key)

  // Cool fill from the left
  const fill = new THREE.DirectionalLight(0xd0e4ff, 0.45)
  fill.position.set(-5, 3, 2)
  scene.add(fill)

  // Subtle rim from below-back
  const rim = new THREE.DirectionalLight(0xffe8d0, 0.35)
  rim.position.set(0, -4, -5)
  scene.add(rim)
}
