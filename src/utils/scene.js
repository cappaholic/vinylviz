import * as THREE from 'three'
import { solidTexture, generateBackCoverTexture, generateVinylTextureAsync } from './textures.js'

/**
 * Real-world scale reference (Three.js units = inches for clarity):
 *   LP sleeve: 12.375" × 12.375"  → SZ = 12.375
 *   LP disc:   12" diameter        → VINYL_R = 6
 *   LP thickness: 0.06" (1.5mm)    → VINYL_T = 0.06
 *   Centre hole: 0.286" radius     → HOLE_R  = 0.143
 *
 * We keep these as inches then scale the whole scene so it looks right in view.
 * Scale factor: 1 Three.js unit ≈ 1 inch, camera pulled back accordingly.
 */

const SCALE = 0.26          // inch → scene unit
const SZ    = 12.375 * SCALE  // sleeve side   ≈ 3.22 scene units
const ST    = 0.18   * SCALE  // sleeve thick  ≈ 0.047
const VR    = 6.0    * SCALE  // vinyl radius  ≈ 1.56
const VT    = 0.06   * SCALE  // vinyl thick   ≈ 0.0156
const HR    = 0.143  * SCALE  // hole radius   ≈ 0.037  (0.286" / 2)

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

  const isGatefold = !!(images.innerLeft || images.innerRight)
  const fitMode    = meta.imageFit || 'crop'   // 'crop' | 'stretch'
  const vinylColor = meta.vinylColor || '#080808'
  const isClear    = vinylColor === 'clear'

  // ─── Texture loader — crop or stretch to square ───────────────────────────
  const makeTex = (dataUrl, fallback) => {
    if (!dataUrl) return Promise.resolve(solidTexture(fallback || '#1c1c1c'))
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const SIZE = 1024
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = SIZE
        const ctx = canvas.getContext('2d')
        if (fitMode === 'stretch') {
          ctx.drawImage(img, 0, 0, SIZE, SIZE)
        } else {
          // Centre-crop (object-fit: cover)
          const s  = Math.min(img.width, img.height)
          const sx = (img.width  - s) / 2
          const sy = (img.height - s) / 2
          ctx.drawImage(img, sx, sy, s, s, 0, 0, SIZE, SIZE)
        }
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.flipY = true
        resolve(tex)
      }
      img.onerror = () => resolve(solidTexture(fallback || '#1c1c1c'))
      img.src = dataUrl
    })
  }

  // ─── Load all textures in parallel ───────────────────────────────────────
  const [frontTex, innerLeftTex, innerRightTex, vinylTex] = await Promise.all([
    makeTex(images.front, '#1c1c1c'),
    makeTex(images.innerLeft,  '#1a1a1a'),
    makeTex(images.innerRight, '#1a1a1a'),
    generateVinylTextureAsync({
      artist: meta.artist, albumTitle: meta.albumTitle,
      labelDataUrl: images.label || null, vinylColor, isClear,
    }),
  ])

  const backTex = images.back
    ? await makeTex(images.back, '#111')
    : generateBackCoverTexture({ artist: meta.artist, albumTitle: meta.albumTitle, year: meta.year, tracks: meta.tracks })

  // ─── Materials ────────────────────────────────────────────────────────────
  // Light gray edge — almost white but not quite (#e8e8e8 ≈ very light gray)
  const edgeMat = () => new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.88 })
  const surfMat = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.02 })

  // ─── Sleeve / Gatefold ───────────────────────────────────────────────────
  if (isGatefold) {
    const halfW     = SZ / 2
    const panelGeo  = new THREE.BoxGeometry(halfW, SZ, ST)
    const openAngle = THREE.MathUtils.degToRad(42)

    const leftPivot = new THREE.Group()
    const leftMesh  = new THREE.Mesh(panelGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(innerLeftTex),
      surfMat(backTex),
    ])
    leftMesh.position.x = -halfW / 2
    leftMesh.castShadow = true
    leftMesh.receiveShadow = true
    leftPivot.add(leftMesh)
    leftPivot.rotation.y = openAngle
    group.add(leftPivot)

    const rightPivot = new THREE.Group()
    const rightMesh  = new THREE.Mesh(panelGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(innerRightTex),
      surfMat(frontTex),
    ])
    rightMesh.position.x = halfW / 2
    rightMesh.castShadow = true
    rightMesh.receiveShadow = true
    rightPivot.add(rightMesh)
    rightPivot.rotation.y = -openAngle
    group.add(rightPivot)

  } else {
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

    // Inner sleeve peek
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(SZ * 0.92, SZ * 0.92, ST * 0.5),
      [edgeMat(), edgeMat(), edgeMat(), edgeMat(), surfMat(innerLeftTex), surfMat(innerLeftTex)]
    )
    inner.position.set(0, 0.1, ST * 0.6)
    inner.castShadow = true
    group.add(inner)
  }

  // ─── Vinyl record ─────────────────────────────────────────────────────────
  // Colour & transparency
  const vColor = new THREE.Color(isClear ? 0x99bbcc : vinylColor)

  // For coloured (non-black, non-clear) vinyl: make it visibly semi-transparent
  const isBlack    = vinylColor === '#080808' || vinylColor === '#000000' || vinylColor === '#000'
  const useTransp  = isClear || !isBlack
  const opacity    = isClear ? 0.38 : isBlack ? 1.0 : 0.55

  const transpOpts = useTransp ? { transparent: true, depthWrite: false, opacity } : {}

  const topMat = new THREE.MeshStandardMaterial({
    map: vinylTex, roughness: 0.10, metalness: 0.90,
    ...transpOpts,
    ...(useTransp ? { color: isClear ? new THREE.Color(0xbbddee) : vColor } : {}),
  })
  const botMat = new THREE.MeshStandardMaterial({
    map: vinylTex,   // label on BOTH sides
    roughness: 0.10, metalness: 0.90,
    ...transpOpts,
    ...(useTransp ? { color: isClear ? new THREE.Color(0xbbddee) : vColor } : {}),
  })
  const edgeMatV = new THREE.MeshStandardMaterial({
    color: vColor, roughness: 0.22, metalness: 0.65,
    ...transpOpts,
  })

  // Use a ring geometry (CylinderGeometry with openEnded faces + two rings for caps)
  // to create the spindle hole.
  // Outer radius = VR, inner radius = HR, thickness = VT
  // Three.js CylinderGeometry doesn't natively support inner radius,
  // so we use a LatheGeometry or combine shapes.
  // Simplest: use a solid cylinder and subtract with a boolean — not available in r128.
  // Instead: use a custom ring BufferGeometry for the flat faces + open cylinder for edge.

  // Top / bottom ring faces
  const makeRingGeo = () => {
    const geo   = new THREE.RingGeometry(HR, VR, 128, 1)
    // RingGeometry lies in XZ, need to map UV nicely — it's already UV mapped
    return geo
  }

  const ringTop = new THREE.Mesh(makeRingGeo(), topMat)
  ringTop.rotation.x = -Math.PI / 2
  ringTop.position.y =  VT / 2

  const ringBot = new THREE.Mesh(makeRingGeo(), botMat)
  ringBot.rotation.x =  Math.PI / 2  // flip so face points down
  ringBot.position.y = -VT / 2

  // Outer edge cylinder (open ended)
  const outerEdge = new THREE.Mesh(
    new THREE.CylinderGeometry(VR, VR, VT, 128, 1, true),
    edgeMatV
  )

  // Inner hole edge (open ended, inner surface)
  const innerEdge = new THREE.Mesh(
    new THREE.CylinderGeometry(HR, HR, VT, 64, 1, true),
    edgeMatV
  )

  // Bevel rings (flat torus at top/bottom outer edge — no seam)
  const bevelGeo = new THREE.TorusGeometry(VR - 0.001, VT * 0.3, 8, 128)
  const bTop = new THREE.Mesh(bevelGeo, edgeMatV)
  bTop.rotation.x =  Math.PI / 2; bTop.position.y =  VT / 2
  const bBot = new THREE.Mesh(bevelGeo, edgeMatV)
  bBot.rotation.x =  Math.PI / 2; bBot.position.y = -VT / 2

  const recordGroup = new THREE.Group()
  recordGroup.name  = 'recordGroup'
  recordGroup.add(ringTop, ringBot, outerEdge, innerEdge, bTop, bBot)

  // Position: sleeve sits upright at y=0 center, its bottom is at -SZ/2.
  // Record sits flat on a "table" below and in front — well clear of the sleeve.
  const sleeveBottom = -SZ / 2
  recordGroup.position.set(0, sleeveBottom - VR * 0.55, VR * 1.1)
  group.add(recordGroup)

  // ─── Shadow plane ─────────────────────────────────────────────────────────
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.06 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y  = sleeveBottom - VR * 1.1
  shadowPlane.receiveShadow = true
  group.add(shadowPlane)

  // Starting orientation
  group.rotation.x = -0.18
  group.rotation.y =  0.22

  return { group, recordGroup, vinylDisc: ringTop }
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
  key.shadow.camera.left = key.shadow.camera.bottom = -10
  key.shadow.camera.right = key.shadow.camera.top   =  10
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 60
  key.shadow.bias = -0.0004
  scene.add(key)

  const fill = new THREE.DirectionalLight(0xd0e4ff, 0.45)
  fill.position.set(-5, 3, 2)
  scene.add(fill)

  const rim = new THREE.DirectionalLight(0xffe8d0, 0.35)
  rim.position.set(0, -4, -5)
  scene.add(rim)
}
