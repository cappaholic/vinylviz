import * as THREE from 'three'
import { solidTexture, generateBackCoverTexture, generateVinylTextureAsync, generateLabelTextureAsync } from './textures.js'

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
    generateVinylTextureAsync({ vinylColor, isClear }),
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
    // Each panel is a FULL 12.375" × 12.375" square — two complete covers opening like a book.
    const panelGeo  = new THREE.BoxGeometry(SZ, SZ, ST)
    const openAngle = THREE.MathUtils.degToRad(38)

    // Left panel — pivots from its RIGHT edge (spine hinge at x=0)
    const leftPivot = new THREE.Group()
    const leftMesh  = new THREE.Mesh(panelGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(innerLeftTex),  // +Z = inside face
      surfMat(backTex),       // -Z = outside / back cover
    ])
    leftMesh.position.x = -SZ / 2   // shift so right edge sits at pivot origin
    leftMesh.castShadow = true
    leftMesh.receiveShadow = true
    leftPivot.add(leftMesh)
    leftPivot.rotation.y = openAngle
    group.add(leftPivot)

    // Right panel — pivots from its LEFT edge (spine hinge at x=0)
    const rightPivot = new THREE.Group()
    const rightMesh  = new THREE.Mesh(panelGeo, [
      edgeMat(), edgeMat(), edgeMat(), edgeMat(),
      surfMat(innerRightTex), // +Z = inside face
      surfMat(frontTex),      // -Z = outside / front cover
    ])
    rightMesh.position.x = SZ / 2   // shift so left edge sits at pivot origin
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

    // Inner sleeve peek — only rendered if user has uploaded inner art
    if (images.innerLeft) {
      const inner = new THREE.Mesh(
        new THREE.BoxGeometry(SZ * 0.92, SZ * 0.92, ST * 0.5),
        [edgeMat(), edgeMat(), edgeMat(), edgeMat(), surfMat(innerLeftTex), surfMat(innerLeftTex)]
      )
      inner.position.set(0, 0.1, ST * 0.6)
      inner.castShadow = true
      group.add(inner)
    }
  }

  // ─── Vinyl record ─────────────────────────────────────────────────────────
  const vColor  = new THREE.Color(isClear ? 0x99bbcc : vinylColor)
  const isBlack = vinylColor === '#080808' || vinylColor === '#000000' || vinylColor === '#000'
  const isWhite = vinylColor === '#e8e8e8' || vinylColor === '#ffffff' || vinylColor === '#fff'
  const useTransp = isClear || (!isBlack && !isWhite)
  const opacity = isClear ? 0.52 : 1.0  // everything non-clear is fully opaque
  const transpOpts = useTransp ? { transparent: true, depthWrite: true, opacity } : {}

  const topMat = new THREE.MeshStandardMaterial({
    map: vinylTex, roughness: 0.08, metalness: 0.92,
    ...transpOpts,
  })
  const botMat = new THREE.MeshStandardMaterial({
    map: vinylTex, roughness: 0.08, metalness: 0.92,
    ...transpOpts,
  })
  const edgeMatV = new THREE.MeshStandardMaterial({
    color: vColor, roughness: 0.18, metalness: 0.75,
    ...transpOpts,
  })

  // Single clean disc — no bevel torus rings (they caused the double-edge look)
  const vinylDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(VR, VR, VT, 192, 1, false),
    [edgeMatV, topMat, botMat]
  )
  vinylDisc.name = 'vinylDisc'
  vinylDisc.castShadow = true
  vinylDisc.receiveShadow = true

  // ── Label — flat circle, slightly inset from disc face ───────────────────
  const LR = VR * 0.285
  const labelTex = await generateLabelTextureAsync({
    artist: meta.artist, albumTitle: meta.albumTitle,
    labelDataUrl: images.label || null,
  })
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex, roughness: 0.55, metalness: 0.05,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  })
  const labelGeo = new THREE.CircleGeometry(LR, 64)
  const labelTop = new THREE.Mesh(labelGeo, labelMat)
  labelTop.rotation.x = -Math.PI / 2
  labelTop.position.y =  VT / 2 + 0.0001
  labelTop.renderOrder = 1
  const labelBot = new THREE.Mesh(labelGeo, labelMat)
  labelBot.rotation.x =  Math.PI / 2
  labelBot.position.y = -VT / 2 - 0.0001
  labelBot.renderOrder = 1

  // ── Spindle hole — tall enough to punch through disc AND both label stickers
  const holeTopMat  = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const holeEdgeMat = new THREE.MeshBasicMaterial({ color: vColor })
  const holeCap = new THREE.Mesh(
    new THREE.CylinderGeometry(HR, HR, VT + 0.004, 48, 1, false),
    [holeEdgeMat, holeTopMat, holeTopMat]
  )
  holeCap.renderOrder = 2  // above label (renderOrder 1) and disc

  const recordGroup = new THREE.Group()
  recordGroup.name  = 'recordGroup'
  recordGroup.add(vinylDisc, labelTop, labelBot, holeCap)

  const sleeveBottom = -SZ / 2
  recordGroup.position.set(0, sleeveBottom - VR * 0.3, VR * 1.45)
  group.add(recordGroup)

  // ─── Shadow plane ─────────────────────────────────────────────────────────
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShadowMaterial({ opacity: 0.05 })
  )
  shadowPlane.rotation.x = -Math.PI / 2
  shadowPlane.position.y  = sleeveBottom - VR * 0.9
  shadowPlane.receiveShadow = true
  group.add(shadowPlane)

  group.rotation.x = -0.14
  group.rotation.y =  0.22

  return { group, recordGroup, vinylDisc: recordGroup }
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
