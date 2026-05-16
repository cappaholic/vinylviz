import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { setupLights } from '../utils/scene.js'

const CAMERA_DEFAULTS = {
  theta: 0.35,
  phi: 1.05,
  r: 5.8,
  panX: 0,
  panY: 0,
}

export function useThreeRenderer(canvasRef) {
  const rendererRef  = useRef(null)
  const sceneRef     = useRef(null)
  const cameraRef    = useRef(null)
  const rafRef       = useRef(null)
  const stateRef     = useRef({ ...CAMERA_DEFAULTS })
  const targetRef    = useRef({ ...CAMERA_DEFAULTS })
  const dragRef      = useRef({ active: false, right: false, lastX: 0, lastY: 0 })
  const spinRef      = useRef({ active: false, angle: 0, mesh: null })
  const albumRef     = useRef(null) // { group, recordGroup, vinylDisc }

  // ── Init renderer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.fog = null
    sceneRef.current = scene

    setupLights(scene)

    const W = canvas.parentElement.clientWidth
    const H = canvas.parentElement.clientHeight

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.01, 100)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    rendererRef.current = renderer

    positionCamera(camera, stateRef.current)

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const s = stateRef.current
      const t = targetRef.current
      const sp = spinRef.current

      // Smooth lerp camera state
      s.theta += (t.theta - s.theta) * 0.09
      s.phi   += (t.phi   - s.phi)   * 0.09
      s.r     += (t.r     - s.r)     * 0.09
      s.panX  += (t.panX  - s.panX)  * 0.09
      s.panY  += (t.panY  - s.panY)  * 0.09

      positionCamera(camera, s)

      if (sp.active && sp.mesh) {
        sp.angle += 0.006
        sp.mesh.rotation.y = sp.angle
      }

      renderer.render(scene, camera)
    }
    loop()

    const onResize = () => {
      const W = canvas.parentElement.clientWidth
      const H = canvas.parentElement.clientHeight
      renderer.setSize(W, H)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafRef.current)
      renderer.dispose()
    }
  }, [])

  // ── Camera helpers ────────────────────────────────────────────────────────
  function positionCamera(camera, s) {
    const x = s.r * Math.sin(s.phi) * Math.sin(s.theta)
    const y = s.r * Math.cos(s.phi)
    const z = s.r * Math.sin(s.phi) * Math.cos(s.theta)
    camera.position.set(x + s.panX, y + s.panY, z)
    camera.lookAt(s.panX, s.panY, 0)
  }

  const setView = useCallback((preset) => {
    const t = targetRef.current
    t.panX = 0
    t.panY = 0

    const albumGroup = albumRef.current?.group
    if (albumGroup) {
      albumGroup.rotation.x = 0
      albumGroup.rotation.y = 0
    }

    switch (preset) {
      case 'perspective':
        t.theta = 0.35; t.phi = 1.05; t.r = 5.8
        if (albumGroup) { albumGroup.rotation.x = -0.12; albumGroup.rotation.y = 0.3 }
        break
      case 'front':
        t.theta = 0; t.phi = Math.PI / 2; t.r = 4.0
        break
      case 'back':
        t.theta = Math.PI; t.phi = Math.PI / 2; t.r = 4.0
        break
      case 'record':
        t.theta = 0.3; t.phi = 0.3; t.r = 4.2
        if (albumGroup) { albumGroup.rotation.x = 0; albumGroup.rotation.y = 0.2 }
        break
      case 'top':
        t.theta = 0; t.phi = 0.08; t.r = 5.5
        break
      default:
        break
    }
  }, [])

  const resetView = useCallback(() => setView('perspective'), [setView])

  const toggleSpin = useCallback(() => {
    const sp = spinRef.current
    sp.active = !sp.active
    if (sp.active) setView('record')
    return sp.active
  }, [setView])

  const setSpin = useCallback((mesh) => {
    spinRef.current.mesh = mesh
  }, [])

  const setAlbumRefs = useCallback((refs) => {
    albumRef.current = refs
    spinRef.current.mesh = refs?.vinylDisc || null
  }, [])

  // ── Mouse / touch controls ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e) => {
      dragRef.current = { active: true, right: e.button === 2, lastX: e.clientX, lastY: e.clientY }
    }
    const onMouseUp = () => { dragRef.current.active = false }
    const onMouseMove = (e) => {
      if (!dragRef.current.active) return
      const dx = e.clientX - dragRef.current.lastX
      const dy = e.clientY - dragRef.current.lastY
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
      const t = targetRef.current
      if (dragRef.current.right) {
        t.panX -= dx * 0.004
        t.panY += dy * 0.004
      } else {
        t.theta -= dx * 0.008
        t.phi = Math.max(0.05, Math.min(Math.PI - 0.05, t.phi + dy * 0.008))
      }
    }
    const onWheel = (e) => {
      e.preventDefault()
      targetRef.current.r = Math.max(1.8, Math.min(14, targetRef.current.r + e.deltaY * 0.005))
    }
    const onDblClick = () => resetView()
    const onCtxMenu = (e) => e.preventDefault()

    // Touch
    let lastTouchDist = null
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        dragRef.current = { active: true, right: false, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY }
      }
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }
    }
    const onTouchEnd = () => { dragRef.current.active = false; lastTouchDist = null }
    const onTouchMove = (e) => {
      e.preventDefault()
      if (e.touches.length === 1 && dragRef.current.active) {
        const dx = e.touches[0].clientX - dragRef.current.lastX
        const dy = e.touches[0].clientY - dragRef.current.lastY
        dragRef.current.lastX = e.touches[0].clientX
        dragRef.current.lastY = e.touches[0].clientY
        targetRef.current.theta -= dx * 0.01
        targetRef.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, targetRef.current.phi + dy * 0.01))
      }
      if (e.touches.length === 2 && lastTouchDist !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        targetRef.current.r = Math.max(1.8, Math.min(14, targetRef.current.r - (dist - lastTouchDist) * 0.01))
        lastTouchDist = dist
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDblClick)
    canvas.addEventListener('contextmenu', onCtxMenu)
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDblClick)
      canvas.removeEventListener('contextmenu', onCtxMenu)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchmove', onTouchMove)
    }
  }, [resetView])

  return {
    sceneRef,
    rendererRef,
    setView,
    resetView,
    toggleSpin,
    setSpin,
    setAlbumRefs,
  }
}
