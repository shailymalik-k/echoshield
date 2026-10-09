import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Html } from '@react-three/drei'
import * as THREE from 'three'
import SceneManager from '@/components/Viewer3D/SceneManager'
import VolumeRenderer from '@/components/Viewer3D/VolumeRenderer'
import IsosurfaceRenderer from '@/components/Viewer3D/IsosurfaceRenderer'
import ViewportDataController from '@/components/Viewer3D/ViewportDataController'
import OceanSurface from '@/components/Viewer3D/OceanSurface'
import OceanFloor from '@/components/Viewer3D/OceanFloor'
import CurrentArrows from '@/components/Viewer3D/CurrentArrows'
import InstrumentMarkers from '@/components/Viewer3D/InstrumentMarkers'
import CanvasProbe from '@/components/Viewer3D/CanvasProbe'
import { useSliceStack } from '@/hooks/useOceanData'
import { useOceanStore } from '@/store/oceanStore'

function getMaxDpr() {
  if (typeof window === 'undefined') return 1
  const memory = Number(navigator.deviceMemory || 4)
  const cores = Number(navigator.hardwareConcurrency || 4)
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  if (mobile || memory <= 4 || cores <= 4) return 1
  if (memory <= 8 || cores <= 8) return 1.25
  return 1.5
}

function isConstrainedDevice() {
  if (typeof window === 'undefined') return false
  const memory = Number(navigator.deviceMemory || 4)
  const cores = Number(navigator.hardwareConcurrency || 4)
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
  return mobile || memory <= 4 || cores <= 4
}

export default function OceanViewer() {
  const [generation, setGeneration] = useState(0)
  const [recovering, setRecovering] = useState(false)
  const recoveryTimer = useRef(null)

  const datasetId = useOceanStore((s) => s.activeDatasetId)
  const variable = useOceanStore((s) => s.activeVariable)
  const timeIndex = useOceanStore((s) => s.timeIndex)
  const activeDepth = useOceanStore((s) => s.activeDepth)
  const datasets = useOceanStore((s) => s.datasets)
  const stack = useSliceStack(datasetId, variable, timeIndex, activeDepth)

  const activeDataset = datasets.find((d) => d.id === datasetId)
  const remoteDataset =
    activeDataset?.source_type === 'erddap_remote' || activeDataset?.source_type === 'erddap_tabledap'
  // A failed slice stack currently renders as a silent blank scene; surface
  // why instead of leaving an empty ocean behind.
  const sliceError = stack.isError && !stack.isLoading

  const recover = useCallback(() => {
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current)

    // Unmount the old Canvas first. A lost WebGL context cannot be reliably
    // repaired by React re-rendering the same canvas element.
    setRecovering(true)
    recoveryTimer.current = setTimeout(() => {
      setGeneration((value) => value + 1)
      setRecovering(false)
      recoveryTimer.current = null
    }, 250)
  }, [])

  useEffect(() => () => {
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current)
  }, [])

  const handleCreated = useCallback(({ gl }) => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.setClearColor('#020b18')

    const canvas = gl.domElement
    const handleContextLost = (event) => {
      event.preventDefault()
      recover()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, { once: true })
  }, [recover])

  if (recovering) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-abyss">
        <div className="glass-panel px-5 py-4 text-center">
          <p className="text-glow text-sm font-semibold">Recovering 3D renderer…</p>
          <p className="mt-1 text-xs text-text-muted">Recreating the WebGL context.</p>
        </div>
      </div>
    )
  }

  const constrained = isConstrainedDevice()

  return (
    <div className="absolute inset-0">
      <Canvas
        key={generation}
        camera={{ position: [0, 80, 120], fov: 45, near: 0.1, far: 2000 }}
        gl={{
          antialias: !constrained,
          alpha: false,
          powerPreference: constrained ? 'default' : 'high-performance',
        }}
        onCreated={handleCreated}
        dpr={[1, getMaxDpr()]}
        performance={{ min: constrained ? 0.35 : 0.5, max: 1, debounce: 250 }}
      >
        <AdaptiveDpr pixelated />
        <SceneManager />
        <ViewportDataController />
        <OceanFloor />
        <VolumeRenderer />
        <IsosurfaceRenderer />
        <OceanSurface />
        <CurrentArrows />
        <InstrumentMarkers />
        <CanvasProbe />
        {/* In-canvas loading indicator — shown while slice data fetches so the
            dark scene doesn't look like a renderer failure */}
        {(stack.isLoading || (!stack.data && !stack.isError && !!datasetId)) && (
          <Html fullscreen zIndexRange={[10, 5]}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  background: 'rgba(2,11,24,0.75)',
                  border: '1px solid rgba(0,212,255,0.25)',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(0,212,255,0.8)',
                  }}
                >
                  Loading ocean slice data…
                </p>
              </div>
            </div>
          </Html>
        )}
      </Canvas>
      {sliceError && (
        <div
          className="glass-panel absolute bottom-28 left-1/2 z-20 max-w-[420px] -translate-x-1/2 rounded-xl px-4 py-2 text-center"
          style={{ borderColor: 'rgba(255,230,109,0.45)' }}
        >
          <p className="text-xs font-semibold" style={{ color: '#ffe66d' }}>
            Slice data unavailable
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {remoteDataset
              ? 'Live ERDDAP data — slow upstream response. Rendering will appear automatically once it responds.'
              : 'No slice data for this selection — try another variable, depth or time.'}
          </p>
        </div>
      )}
    </div>
  )
}
