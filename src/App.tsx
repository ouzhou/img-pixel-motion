import { useEffect, useMemo, useRef, useState } from 'react'
import { Pane } from 'tweakpane'
import icon180 from './assets/icon_180.png'
import './App.css'

type SamplingConfig = {
  sampleWidth: number
  threshold: number
}

type DrawingConfig = {
  block: number
  dotSize: number
  jitter: number
  perlinAlpha: boolean
  radarSweep: boolean
  perlinMotion: boolean
  motionAmount: number
  motionSpeed: number
  repelStrength: number
  spring: number
  damping: number
  influenceRadius: number
  softening: number
  fieldGain: number
  maxInfluence: number
}

const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  sampleWidth: 236,
  threshold: 140,
}

const DEFAULT_DRAWING_CONFIG: DrawingConfig = {
  block: 4,
  dotSize: 3.2,
  jitter: 0.14,
  perlinAlpha: false,
  radarSweep: false,
  perlinMotion: true,
  motionAmount: 1.2,
  motionSpeed: 0.7,
  repelStrength: 8.48,
  spring: 0.065,
  damping: 0.745,
  influenceRadius: 177,
  softening: 12,
  fieldGain: 910,
  maxInfluence: 2.4,
}
const BASE_RENDER_WIDTH = 592
const CANVAS_WIDTH = 820
const CANVAS_HEIGHT = 520
const DEFAULT_DISPLAY_SCALE = 0.6

type PaneFolder = {
  addBinding: (target: object, key: string, options?: object) => void
}

type PaneApi = {
  addFolder: (options: { title: string; expanded?: boolean }) => PaneFolder
  on: (event: 'change', handler: () => void) => void
  refresh: () => void
  dispose: () => void
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const paneHostRef = useRef<HTMLDivElement | null>(null)
  const mouseRef = useRef({ x: 0, y: 0, inside: false })
  const [paneOpen, setPaneOpen] = useState(false)
  const [samplingConfig, setSamplingConfig] = useState<SamplingConfig>(DEFAULT_SAMPLING_CONFIG)
  const [drawingConfig, setDrawingConfig] = useState<DrawingConfig>(DEFAULT_DRAWING_CONFIG)
  const [displayScale, setDisplayScale] = useState(DEFAULT_DISPLAY_SCALE)
  const [copied, setCopied] = useState(false)
  const [dotGrid, setDotGrid] = useState<DotGrid>({ width: 0, height: 0, points: [] })
  const onDotCount = useMemo(
    () => dotGrid.points.reduce((count, point) => count + (point.on ? 1 : 0), 0),
    [dotGrid.points]
  )
  const totalDotCount = dotGrid.points.length
  const onRatio = totalDotCount > 0 ? (onDotCount / totalDotCount) * 100 : 0

  const handleCopyParams = async () => {
    const payload = {
      sampling: samplingConfig,
      drawing: drawingConfig,
      displayScale,
    }
    const text = JSON.stringify(payload, null, 2)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard can fail in some non-secure contexts.
      window.prompt('Copy parameters:', text)
    }
  }

  useEffect(() => {
    const host = paneHostRef.current
    if (!host) return

    const pane = new Pane({
      container: host,
      title: 'Controls',
      expanded: true,
    }) as unknown as PaneApi

    const params = {
      sampleWidth: samplingConfig.sampleWidth,
      threshold: samplingConfig.threshold,
      block: drawingConfig.block,
      dotSize: drawingConfig.dotSize,
      jitter: drawingConfig.jitter,
      perlinAlpha: drawingConfig.perlinAlpha,
      radarSweep: drawingConfig.radarSweep,
      perlinMotion: drawingConfig.perlinMotion,
      motionAmount: drawingConfig.motionAmount,
      motionSpeed: drawingConfig.motionSpeed,
      displayScale,
      repelStrength: drawingConfig.repelStrength,
      spring: drawingConfig.spring,
      damping: drawingConfig.damping,
      influenceRadius: drawingConfig.influenceRadius,
      softening: drawingConfig.softening,
      fieldGain: drawingConfig.fieldGain,
      maxInfluence: drawingConfig.maxInfluence,
    }

    const stats = {
      drawnDots: onDotCount,
      totalDots: totalDotCount,
      ratio: onRatio,
    }

    const samplingFolder = pane.addFolder({ title: 'Sampling' })
    samplingFolder.addBinding(params, 'sampleWidth', { label: 'Density', min: 48, max: 480, step: 2 })
    samplingFolder.addBinding(params, 'threshold', { label: 'Threshold', min: 30, max: 230, step: 1 })

    const drawingFolder = pane.addFolder({ title: 'Drawing' })
    drawingFolder.addBinding(params, 'block', { label: 'Spacing', min: 3, max: 12, step: 0.2 })
    drawingFolder.addBinding(params, 'dotSize', { label: 'Dot Size', min: 1, max: 8, step: 0.1 })
    drawingFolder.addBinding(params, 'jitter', { label: 'Jitter', min: 0, max: 0.8, step: 0.01 })
    drawingFolder.addBinding(params, 'perlinAlpha', { label: 'Perlin Alpha' })
    drawingFolder.addBinding(params, 'radarSweep', { label: 'Radar Sweep' })
    drawingFolder.addBinding(params, 'perlinMotion', { label: 'Perlin Motion' })
    drawingFolder.addBinding(params, 'motionAmount', { label: 'Motion Amount', min: 0, max: 8, step: 0.1 })
    drawingFolder.addBinding(params, 'motionSpeed', { label: 'Motion Speed', min: 0, max: 3, step: 0.05 })
    drawingFolder.addBinding(params, 'displayScale', { label: 'Display Scale', min: 0.3, max: 1, step: 0.01 })

    const forceFolder = pane.addFolder({ title: 'Forces' })
    forceFolder.addBinding(params, 'repelStrength', { label: 'Repel Strength', min: 0, max: 30, step: 0.01 })
    forceFolder.addBinding(params, 'spring', { label: 'Spring', min: 0.02, max: 0.2, step: 0.005 })
    forceFolder.addBinding(params, 'damping', { label: 'Damping', min: 0.7, max: 0.98, step: 0.005 })
    forceFolder.addBinding(params, 'influenceRadius', { label: 'Radius', min: 40, max: 320, step: 1 })
    forceFolder.addBinding(params, 'softening', { label: 'Softening', min: 2, max: 40, step: 0.5 })
    forceFolder.addBinding(params, 'fieldGain', { label: 'Field Gain', min: 80, max: 1200, step: 5 })
    forceFolder.addBinding(params, 'maxInfluence', { label: 'Max Force', min: 0.5, max: 10, step: 0.1 })

    const statsFolder = pane.addFolder({ title: 'Stats' })
    statsFolder.addBinding(stats, 'drawnDots', { label: 'Drawn Dots', readonly: true })
    statsFolder.addBinding(stats, 'totalDots', { label: 'Total Dots', readonly: true })
    statsFolder.addBinding(stats, 'ratio', {
      label: 'Ratio (%)',
      readonly: true,
      format: (v: number) => v.toFixed(1),
    })

    pane.on('change', () => {
      setSamplingConfig({ sampleWidth: params.sampleWidth, threshold: params.threshold })
      setDrawingConfig((prev) => ({
        ...prev,
        block: params.block,
        dotSize: params.dotSize,
        jitter: params.jitter,
        perlinAlpha: params.perlinAlpha,
        radarSweep: params.radarSweep,
        perlinMotion: params.perlinMotion,
        motionAmount: params.motionAmount,
        motionSpeed: params.motionSpeed,
        repelStrength: params.repelStrength,
        spring: params.spring,
        damping: params.damping,
        influenceRadius: params.influenceRadius,
        softening: params.softening,
        fieldGain: params.fieldGain,
        maxInfluence: params.maxInfluence,
      }))
      setDisplayScale(params.displayScale)

      stats.drawnDots = onDotCount
      stats.totalDots = totalDotCount
      stats.ratio = onRatio
      pane.refresh()
    })

    return () => {
      pane.dispose()
    }
  }, [displayScale, drawingConfig, onDotCount, onRatio, samplingConfig, totalDotCount])

  useEffect(() => {
    let cancelled = false
    void buildBinaryDotGrid(icon180, samplingConfig.sampleWidth, samplingConfig.threshold).then((grid) => {
      if (cancelled) return
      setDotGrid(grid)
    })

    return () => {
      cancelled = true
    }
  }, [samplingConfig.sampleWidth, samplingConfig.threshold])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const canvasWidth = canvas.width
    const canvasHeight = canvas.height
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#000000'

    // Keep image size stable across sampling density changes.
    // `block` slider acts as zoom around default size.
    const zoom = drawingConfig.block / DEFAULT_DRAWING_CONFIG.block
    const block = dotGrid.width > 0 ? (BASE_RENDER_WIDTH / dotGrid.width) * zoom : 0
    const originX = (canvasWidth - dotGrid.width * block) * 0.5 + block * 0.5
    const originY = (canvasHeight - dotGrid.height * block) * 0.5 + block * 0.5
    const centerX = originX + (dotGrid.width - 1) * block * 0.5
    const centerY = originY + (dotGrid.height - 1) * block * 0.5
    const radius = drawingConfig.dotSize * 0.5
    const jitterPx = drawingConfig.jitter * block

    type Particle = {
      x: number
      y: number
      homeX: number
      homeY: number
      vx: number
      vy: number
    }
    const particles: Particle[] = []

    for (let i = 0; i < dotGrid.points.length; i += 1) {
      const pt = dotGrid.points[i]
      if (!pt.on) continue
      const jx = (hash2D(pt.x, pt.y, 1) * 2 - 1) * jitterPx
      const jy = (hash2D(pt.x, pt.y, 2) * 2 - 1) * jitterPx
      const homeX = originX + pt.x * block + jx
      const homeY = originY + pt.y * block + jy
      particles.push({ x: homeX, y: homeY, homeX, homeY, vx: 0, vy: 0 })
    }

    const spring = drawingConfig.spring
    const damping = drawingConfig.damping
    const influenceRadius = drawingConfig.influenceRadius
    const softening = drawingConfig.softening
    const softeningSq = softening * softening
    const fieldGain = drawingConfig.fieldGain
    const maxInfluence = drawingConfig.maxInfluence

    let rafId = 0
    const frame = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      if (!drawingConfig.perlinAlpha && !drawingConfig.radarSweep) {
        ctx.fillStyle = '#000000'
      }
      const t = performance.now() * 0.001
      const sweepAngle = t * 1.8
      const beamWidth = 0.2
      const rippleFreq = 0.09
      const rippleSpeed = 4.2

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i]
        let fx = (p.homeX - p.x) * spring
        let fy = (p.homeY - p.y) * spring

        if (mouseRef.current.inside) {
          const dx = p.x - mouseRef.current.x
          const dy = p.y - mouseRef.current.y
          const distSq = dx * dx + dy * dy
          if (distSq > 0.0001) {
            const dist = Math.sqrt(distSq)
            const nx = dx / dist
            const ny = dy / dist
            // Remove hard cutoff to avoid visible circular border.
            // Use a smooth gate on top of inverse-square attenuation.
            const gate = Math.exp(-distSq / (2 * influenceRadius * influenceRadius))
            const influence = Math.min(
              maxInfluence,
              ((drawingConfig.repelStrength * fieldGain) / (distSq + softeningSq)) * gate
            )
            fx += nx * influence
            fy += ny * influence
          }
        }

        p.vx = (p.vx + fx) * damping
        p.vy = (p.vy + fy) * damping
        p.x += p.vx
        p.y += p.vy

        let renderX = p.x
        let renderY = p.y
        if (drawingConfig.perlinMotion) {
          // Breathing motion: synchronized in/out pulse with per-point phase offsets.
          const phase = perlinNoise3D(p.homeX * 0.01, p.homeY * 0.01, 0.0) * Math.PI * 2
          const pulse = Math.sin(t * drawingConfig.motionSpeed * 2 + phase)
          const localWeight = 0.5 + 0.5 * perlinNoise3D(p.homeX * 0.02, p.homeY * 0.02, 11.3)
          const amount = drawingConfig.motionAmount * 0.8 * localWeight * pulse
          const vx = p.homeX - centerX
          const vy = p.homeY - centerY
          const vlen = Math.hypot(vx, vy) || 1
          renderX += (vx / vlen) * amount
          renderY += (vy / vlen) * amount
        }

        let alpha = 1
        if (drawingConfig.perlinAlpha) {
          const n = perlinNoise3D(p.homeX * 0.015, p.homeY * 0.015, t * 0.8)
          alpha *= 0.25 + 0.75 * n
        }
        if (drawingConfig.radarSweep) {
          const vx = p.homeX - centerX
          const vy = p.homeY - centerY
          const angle = Math.atan2(vy, vx)
          const dAngle = angleDiff(angle, sweepAngle)
          const beam = Math.exp(-((dAngle * dAngle) / (2 * beamWidth * beamWidth)))
          const dist = Math.hypot(vx, vy)
          const ripple = 0.5 + 0.5 * Math.sin(dist * rippleFreq - t * rippleSpeed)
          const radarAlpha = 0.15 + 0.85 * (0.7 * beam + 0.3 * ripple)
          alpha *= radarAlpha
        }
        if (drawingConfig.perlinAlpha || drawingConfig.radarSweep) {
          ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`
        }
        ctx.beginPath()
        ctx.arc(renderX, renderY, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      rafId = window.requestAnimationFrame(frame)
    }

    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * canvas.width
      mouseRef.current.y = ((event.clientY - rect.top) / rect.height) * canvas.height
      mouseRef.current.inside = true
    }
    const onMouseLeave = () => {
      mouseRef.current.inside = false
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [
    dotGrid,
    drawingConfig.block,
    drawingConfig.dotSize,
    drawingConfig.jitter,
    drawingConfig.perlinAlpha,
    drawingConfig.radarSweep,
    drawingConfig.perlinMotion,
    drawingConfig.motionAmount,
    drawingConfig.motionSpeed,
    drawingConfig.repelStrength,
    drawingConfig.spring,
    drawingConfig.damping,
    drawingConfig.influenceRadius,
    drawingConfig.softening,
    drawingConfig.fieldGain,
    drawingConfig.maxInfluence,
  ])

  return (
    <main className="page">
      <section className="controls">
        <div className="pane-actions">
          <button type="button" className="pane-toggle" onClick={() => setPaneOpen((prev) => !prev)}>
            {paneOpen ? 'Hide Controls' : 'Show Controls'}
          </button>
          <button type="button" className="pane-copy" onClick={() => void handleCopyParams()}>
            {copied ? 'Copied' : 'Copy Params'}
          </button>
        </div>
        <div ref={paneHostRef} className="pane-host" style={{ display: paneOpen ? 'block' : 'none' }} />
      </section>
      <div className="canvas-host">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ width: `${CANVAS_WIDTH * displayScale}px`, height: `${CANVAS_HEIGHT * displayScale}px` }}
        />
      </div>
    </main>
  )
}

type DotPoint = { x: number; y: number; on: boolean }
type DotGrid = { width: number; height: number; points: DotPoint[] }

async function buildBinaryDotGrid(src: string, sampleWidth: number, threshold: number): Promise<DotGrid> {
  const img = await loadImage(src)
  const sampleHeight = Math.max(1, Math.round((img.height / img.width) * sampleWidth))

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = sampleWidth
  tempCanvas.height = sampleHeight
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return { width: sampleWidth, height: sampleHeight, points: [] }

  ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight)
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight)
  const pixels = imageData.data

  const luminanceBuffer = new Float32Array(sampleWidth * sampleHeight)
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const i = (y * sampleWidth + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const a = pixels[i + 3]
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      // Transparent pixels should remain background.
      luminanceBuffer[y * sampleWidth + x] = a > 20 ? luminance : 255
    }
  }

  const points: DotPoint[] = []
  // Floyd-Steinberg dithering: preserves midtones/shadows via local error diffusion.
  for (let y = 0; y < sampleHeight; y += 1) {
    for (let x = 0; x < sampleWidth; x += 1) {
      const idx = y * sampleWidth + x
      const oldValue = luminanceBuffer[idx]
      const newValue = oldValue < threshold ? 0 : 255
      const error = oldValue - newValue
      points.push({ x, y, on: newValue === 0 })

      if (x + 1 < sampleWidth) {
        luminanceBuffer[idx + 1] += (error * 7) / 16
      }
      if (y + 1 < sampleHeight) {
        if (x > 0) {
          luminanceBuffer[idx + sampleWidth - 1] += (error * 3) / 16
        }
        luminanceBuffer[idx + sampleWidth] += (error * 5) / 16
        if (x + 1 < sampleWidth) {
          luminanceBuffer[idx + sampleWidth + 1] += error / 16
        }
      }
    }
  }

  return { width: sampleWidth, height: sampleHeight, points }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Image load failed: ${src}`))
    img.src = src
  })
}

function hash2D(x: number, y: number, seed: number): number {
  const raw = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
  return raw - Math.floor(raw)
}

const PERLIN_PERM = (() => {
  const base = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69,
    142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219,
    203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230,
    220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76,
    132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173,
    186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206,
    59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163,
    70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
    178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
    81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176,
    115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128,
    195, 78, 66, 215, 61, 156, 180,
  ]
  return [...base, ...base]
})()

function perlinFade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function perlinLerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

function perlinGrad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

function perlinNoise3D(x: number, y: number, z: number): number {
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const zi = Math.floor(z) & 255

  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  const zf = z - Math.floor(z)

  const u = perlinFade(xf)
  const v = perlinFade(yf)
  const w = perlinFade(zf)

  const aaa = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi] + yi] + zi]
  const aba = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi] + yi + 1] + zi]
  const aab = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi] + yi] + zi + 1]
  const abb = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi] + yi + 1] + zi + 1]
  const baa = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi + 1] + yi] + zi]
  const bba = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi + 1] + yi + 1] + zi]
  const bab = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi + 1] + yi] + zi + 1]
  const bbb = PERLIN_PERM[PERLIN_PERM[PERLIN_PERM[xi + 1] + yi + 1] + zi + 1]

  const x1 = perlinLerp(perlinGrad(aaa, xf, yf, zf), perlinGrad(baa, xf - 1, yf, zf), u)
  const x2 = perlinLerp(perlinGrad(aba, xf, yf - 1, zf), perlinGrad(bba, xf - 1, yf - 1, zf), u)
  const y1 = perlinLerp(x1, x2, v)

  const x3 = perlinLerp(perlinGrad(aab, xf, yf, zf - 1), perlinGrad(bab, xf - 1, yf, zf - 1), u)
  const x4 = perlinLerp(
    perlinGrad(abb, xf, yf - 1, zf - 1),
    perlinGrad(bbb, xf - 1, yf - 1, zf - 1),
    u
  )
  const y2 = perlinLerp(x3, x4, v)

  return (perlinLerp(y1, y2, w) + 1) * 0.5
}

function angleDiff(a: number, b: number): number {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export default App
