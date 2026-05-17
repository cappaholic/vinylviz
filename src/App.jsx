import React, { useState, useRef, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Viewport from './components/Viewport.jsx'
import { useThreeRenderer } from './hooks/useThreeRenderer.js'
import { buildAlbumScene } from './utils/scene.js'
import styles from './App.module.css'

const DEFAULT_META = {
  artist: '', albumTitle: '', year: '',
  vinylColor: '#080808',
  imageFit: 'crop',
}
const DEFAULT_TRACKS = ['', '']

export default function App() {
  const canvasRef = useRef(null)

  const [images,       setImages]      = useState({})
  const [meta,         setMeta]        = useState(DEFAULT_META)
  const [tracks,       setTracks]      = useState(DEFAULT_TRACKS)
  const [isRendering,  setRendering]   = useState(false)
  const [isRendered,   setRendered]    = useState(false)
  const [activeView,   setActiveView]  = useState('perspective')
  const [isSpinning,   setSpinning]    = useState(false)
  const [sidebarOpen,  setSidebarOpen] = useState(true)

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
      setSidebarOpen(false)
    } catch (err) {
      console.error('Scene build error:', err)
    } finally {
      setRendering(false)
    }
  }, [sceneRef, images, meta, tracks, setAlbumRefs])

  const handleSetView = useCallback((id) => {
    setActiveView(id)
    setView(id)
  }, [setView])

  const handleToggleSpin = useCallback(() => {
    const nowSpinning = toggleSpin()
    setSpinning(nowSpinning)
    if (nowSpinning) setActiveView('record')
  }, [toggleSpin])

  const firstRender = useRef(true)
  useEffect(() => {
    if (isRendered && firstRender.current) {
      firstRender.current = false
      setTimeout(() => {
        const spinning = toggleSpin()
        setSpinning(spinning)
      }, 500)
    }
  }, [isRendered]) // eslint-disable-line

  return (
    <div className={styles.layout}>
      {/* Sidebar overlays the viewport — no layout shift */}
      <div className={`${styles.sidebar_wrap} ${sidebarOpen ? styles.open : styles.closed}`}>
        <Sidebar
          images={images} meta={meta} tracks={tracks}
          onImageUpload={handleImageUpload}
          onMetaChange={handleMetaChange}
          onTracksChange={setTracks}
          onRender={handleRender}
          isRendering={isRendering}
        />
        <button
          className={styles.sidebar_tab}
          onClick={() => setSidebarOpen(o => !o)}
          title={sidebarOpen ? 'Hide panel' : 'Show panel'}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>
      </div>

      {/* Viewport always fills full layout — sidebar slides over it */}
      <div className={styles.viewport_wrap}>
        <Viewport
          canvasRef={canvasRef}
          isRendered={isRendered}
          activeView={activeView}
          onSetView={handleSetView}
          isSpinning={isSpinning}
          onToggleSpin={handleToggleSpin}
        />
      </div>
    </div>
  )
}
