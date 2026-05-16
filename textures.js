import React, { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Viewport from './components/Viewport.jsx'
import { useThreeRenderer } from './hooks/useThreeRenderer.js'
import { buildAlbumScene } from './utils/scene.js'
import styles from './App.module.css'

const DEFAULT_META = {
  artist:      '',
  albumTitle:  '',
  year:        '',
  sleeveStyle: 'standard',
  vinylColor:  '#080808',
}
const DEFAULT_TRACKS = ['', '']

export default function App() {
  const canvasRef = useRef(null)

  const [images,      setImages]      = useState({})
  const [meta,        setMeta]        = useState(DEFAULT_META)
  const [tracks,      setTracks]      = useState(DEFAULT_TRACKS)
  const [isRendering, setRendering]   = useState(false)
  const [isRendered,  setRendered]    = useState(false)
  const [activeView,  setActiveView]  = useState('perspective')
  const [isSpinning,  setSpinning]    = useState(false)

  const { sceneRef, setView, toggleSpin, setAlbumRefs } = useThreeRenderer(canvasRef)

  const handleImageUpload = useCallback((key, dataUrl) => {
    setImages(prev => ({ ...prev, [key]: dataUrl }))
  }, [])

  const handleMetaChange = useCallback((key, value) => {
    setMeta(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleRender = useCallback(async () => {
    if (!sceneRef.current) return
    setRendering(true)
    try {
      const filteredTracks = tracks.filter(t => t.trim())
      const refs = await buildAlbumScene(sceneRef.current, images, { ...meta, tracks: filteredTracks })
      setAlbumRefs(refs)
      setRendered(true)
      setActiveView('perspective')
      // Auto-start slow spin on the record
      setSpinning(true)
    } catch (err) {
      console.error('Scene build error:', err)
    } finally {
      setRendering(false)
    }
  }, [sceneRef, images, meta, tracks, setAlbumRefs])

  // Sync spinning state into the renderer hook whenever it changes
  useEffect(() => {
    // The renderer's toggleSpin returns the new state; we call it only if
    // the internal state is out of sync — instead we expose setSpin directly
  }, [isSpinning])

  const handleSetView = useCallback((id) => {
    setActiveView(id)
    setView(id)
  }, [setView])

  const handleToggleSpin = useCallback(() => {
    const nowSpinning = toggleSpin()
    setSpinning(nowSpinning)
    if (nowSpinning) setActiveView('record')
  }, [toggleSpin])

  // Kick off auto-spin after first render
  const firstRender = useRef(true)
  useEffect(() => {
    if (isRendered && firstRender.current) {
      firstRender.current = false
      // Small delay so the scene settles before spin starts
      setTimeout(() => {
        const spinning = toggleSpin()
        setSpinning(spinning)
      }, 400)
    }
  }, [isRendered]) // eslint-disable-line

  return (
    <div className={styles.layout}>
      <Sidebar
        images={images}
        meta={meta}
        tracks={tracks}
        onImageUpload={handleImageUpload}
        onMetaChange={handleMetaChange}
        onTracksChange={setTracks}
        onRender={handleRender}
        isRendering={isRendering}
      />
      <Viewport
        canvasRef={canvasRef}
        isRendered={isRendered}
        activeView={activeView}
        onSetView={handleSetView}
        isSpinning={isSpinning}
        onToggleSpin={handleToggleSpin}
      />
    </div>
  )
}
