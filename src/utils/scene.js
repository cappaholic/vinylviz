import * as THREE from 'three'
import { dataUrlToTexture, solidTexture, generateBackCoverTexture, generateVinylTextureAsync } from './textures.js'

export async function buildAlbumScene(scene, images, meta) {
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

  // Auto-detect gatefold: if either inner sleeve image is present, open like a book
  const hasInnerLeft  = !!images.innerLeft
  const hasInnerRight = !!images.innerRight
  const isGatefold    = hasInnerLeft || hasInnerRight

  const vinylColor = meta.vinylColor || '#080808'
  const isClear    = vinylColor === 'clear'

  // ─── Textures ─────────────────────────────────────────────────────────────
  const makeTex = (dataUrl, fallback) => {
    if (!dataUrl) return solidTexture(fallback || '#1c1c1c')
    const tex = new THREE.TextureLoader().load(dataUrl)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.flipY = true
    return tex
  }

  const frontTex      = makeTex(images.front,      '#1c1c1c')
  const backTex       = images.back
    ? makeTex(images.back, '#111')
    : generateBackCoverTexture({ artist: meta.artist, albumTitle: meta.albumTitle, year: meta.year, tracks: meta.tracks })

  // Inner sleeves — fall back to a dark grey if not provided
  const innerLeftTex  = makeTex(images.innerLeft,  '#1a1a1a')
  const innerRightTex = makeTex(images.innerRight, '#1a1a1a')

  const vinylTex = await generateVinylTextureAsync({
    artist: meta.artist, albumTitle: meta.albumTitle,
    labelDataUrl: images.label || null, vinylColor, isClear,
  })

  // ─── Dimensions ───────────────────────────────────────────────────────────
  const SZ = 3.1    // panel height (and width of each panel = SZ/2 for gatefold)
  const ST = 0.072  // panel thickness

  const edgeMat = () => new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.92 })
  const surfMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.02 })

  // ─── Sleeve / Gatefold ───────────────────────────────────────────────────
  if (isGatefold) {
    // Two panels meeting at a center spine, opened like the reference photo.
    // The open angle controls how wide the V is — matching the reference image.
    const halfW    = SZ / 2
    const panelGeo = new THREE.BoxGeometry(halfW, SZ, ST)

    // Open angle: ~40° each side gives a realistic open-book look
    const openAngle = THREE.MathUtils.degToRad(42)

    // ── Left panel ──
    // Outside face (-Z) = back cover  |  Inside face (+Z) = inner-left art
    const leftPanel = new THREE.Mesh(panelGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(innerLeftTex),  // +Z inside
      surfMat(backTex),       // -Z outside / back cover
    ])
    // Pivot from the right edge (spine), so shift left by half panel width first
    leftPanel.position.x = -halfW / 2
    // Rotate open to the left around Y axis at the spine
    leftPanel.rotation.y = openAngle
    leftPanel.castShadow = true
    leftPanel.receiveShadow = true
    group.add(leftPanel)

    // ── Right panel ──
    // Outside face (-Z) = front cover  |  Inside face (+Z) = inner-right art
    const rightPanel = new THREE.Mesh(panelGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(innerRightTex), // +Z inside
      surfMat(frontTex),      // -Z outside / front cover
    ])
    rightPanel.position.x = halfW / 2
    rightPanel.rotation.y = -openAngle
    rightPanel.castShadow = true
    rightPanel.receiveShadow = true
    group.add(rightPanel)

    // ── Spine strip ──
    const spine = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, SZ, ST * 0.8),
      edgeMat()
    )
    spine.position.x = 0
    group.add(spine)

  } else {
    // Standard closed sleeve — front visible, back on the reverse
    const sleeveGeo = new THREE.BoxGeometry(SZ, SZ, ST)
    const sleeve    = new THREE.Mesh(sleeveGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(frontTex),
      surfMat(backTex),
    ])
    sleeve.name = 'sleeve'
    sleeve.castShadow = true
    sleeve.receiveShadow = true
    group.add(sleeve)

    // Inner sleeve peeking from top
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(SZ * 0.92, SZ * 0.92, ST * 0.5),
      [edgeMat(), edgeMat(), edgeMat(), edgeMat(), surfMat(innerLeftTex), surfMat(innerLeftTex)]
    )
    inner.position.set(0, 0.1, 0.014)
    inner.castShadow = true
    group.add(inner)
  }

  // ─── Vinyl record — flat, below sleeve, auto-spinning ────────────────────
  const VINYL_R = 1.45
  const VINYL_T = 0.034

  const vColor   = new THREE.Color(isClear ? 0x99bbcc : vinylColor)
  const clearOpts = isClear ? { transparent: true, depthWrite: false } : {}

  const topMat   = new THREE.MeshStandardMaterial({
    map: vinylTex, roughness: 0.12, metalness: 0.88,
    ...(isClear ? { ...clearOpts, opacity: 0.45, color: new THREE.Color(0xbbddee) } : {}),
  })
  const botMat   = new THREE.MeshStandardMaterial({
    color: vColor, roughness: 0.18, metalness: 0.82,
    ...(isClear ? { ...clearOpts, opacity: 0.32 } : {}),
  })
  const edgeMatV = new THREE.MeshStandardMaterial({
    color: vColor, roughness: 0.22, metalness: 0.65,
    ...(isClear ? { ...clearOpts, opacity: 0.36 } : {}),
  })

  // CylinderGeometry material order: [side, top(+Y), bottom(-Y)]
  const vinylDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(VINYL_R, VINYL_R, VINYL_T, 128, 1, false),
    [edgeMatV, topMat, botMat]
  )
  vinylDisc.name = 'vinylDisc'
  vinylDisc.castShadow = true
  vinylDisc.receiveShadow = true

  // Bevel torus rings — rotated 90° so they lie flat (torus default is upright)
  const bevelGeo = new THREE.TorusGeometry(VINYL_R - 0.003, 0.006, 12, 128)
  const bTop = new THREE.Mesh(bevelGeo, edgeMatV)
  bTop.rotation.x =  Math.PI / 2
  bTop.position.y =  VINYL_T / 2
  const bBot = new THREE.Mesh(bevelGeo, edgeMatV)
  bBot.rotation.x =  Math.PI / 2
  bBot.position.y = -VINYL_T / 2

  const recordGroup = new THREE.Group()
  recordGroup.name = 'recordGroup'
  recordGroup.add(vinylDisc, bTop, bBot)

  // Flat below the sleeve
  const sleeveBottom = -SZ / 2
  recordGroup.position.set(0, sleeveBottom - VINYL_R * 0.65, 0.05)
  group.add(recordGroup)

  // ─── Shadow ───────────────────────────────────────────────────────────────
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.07 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y = sleeveBottom - VINYL_R * 1.2
  shadowPlane.receiveShadow = true
  group.add(shadowPlane)

  // Starting tilt
  group.rotation.x = -0.18
  group.rotation.y =  0.22

  return { group, recordGroup, vinylDisc }
}

export function setupLights(scene) {
  scene.background = new THREE.Color(0xffffff)
  scene.fog = null

  const toRemove = []
  scene.traverse(obj => { if (obj.isLight) toRemove.push(obj) })
  toRemove.forEach(l => scene.remove(l))

  scene.add(new THREE.AmbientLight(0xffffff, 0.7))

  const key = new THREE.DirectionalLight(0xfff8f0, 1.6)
  key.position.set(5, 9, 6)
  key.castShadow = true
  key.shadow.mapSize.width = key.shadow.mapSize.height = 2048
  key.shadow.camera.left = key.shadow.camera.bottom = -8
  key.shadow.camera.right = key.shadow.camera.top   =  8
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 50
  key.shadow.bias = -0.0004
  scene.add(key)

  scene.add(Object.assign(new THREE.DirectionalLight(0xd0e4ff, 0.45), { position: new THREE.Vector3(-5, 3, 2) }))
  scene.add(Object.assign(new THREE.DirectionalLight(0xffe8d0, 0.35), { position: new THREE.Vector3(0, -4, -5) }))
}
