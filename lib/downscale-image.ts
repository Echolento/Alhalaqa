// lib/downscale-image.ts
// Client-only receipt prep: phone photos are 3-12MB, the transport cap is
// small. Downscale to a 1280px JPEG and drop quality until it fits ~1MB so
// uploads Just Work; anything the browser can't decode (e.g. HEIC on some
// browsers) falls back to the original bytes and the server validator gives
// the clear Arabic error.
// Canvas API => not unit-tested (jsdom has no canvas); keep it tiny.

export interface PreparedReceipt {
  bytes: Uint8Array
  mimeType: string
  fileName: string
  sizeBytes: number
  downscaled: boolean
}

const MAX_SIDE_PX = 1280
/** Below this, upload the original untouched (already cheap). */
const SMALL_ENOUGH_BYTES = 700 * 1024
/** Re-encode until the JPEG is under this; keeps us far from every body cap. */
const TARGET_BYTES = 1024 * 1024
const QUALITIES = [0.82, 0.68, 0.55, 0.42] as const

function canvasSupported(): boolean {
  try {
    return (
      typeof document !== 'undefined' &&
      !!document.createElement('canvas').getContext
    )
  } catch {
    return false
  }
}

function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(img).then(resolve, reject)
      } else {
        reject(new Error('no bitmap'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

function toJpegBytes(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('no ctx'))
      return
    }
    ctx.drawImage(source, 0, 0, width, height)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('encode'))
          return
        }
        blob
          .arrayBuffer()
          .then((buf) => resolve(new Uint8Array(buf)))
          .catch(reject)
      },
      'image/jpeg',
      quality,
    )
  })
}

/** Try decreasing qualities; return the first that fits, else the smallest. */
async function encodeUnderTarget(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
): Promise<Uint8Array> {
  let best: Uint8Array | null = null
  for (const quality of QUALITIES) {
    const bytes = await toJpegBytes(source, width, height, quality)
    if (!best || bytes.byteLength < best.byteLength) best = bytes
    if (bytes.byteLength <= TARGET_BYTES) return bytes
  }
  return best as Uint8Array
}

/** Downscale screenshots/photos so they fit the transport + 5MB caps. Never throws. */
export async function prepareReceiptFile(file: File): Promise<PreparedReceipt> {
  const fallback: PreparedReceipt = {
    bytes: new Uint8Array(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name,
    sizeBytes: file.size,
    downscaled: false,
  }
  try {
    if (!canvasSupported() || !file.type.startsWith('image/')) return fallback
    // Already tiny and already JPEG — skip the work.
    if (file.size <= SMALL_ENOUGH_BYTES && file.type === 'image/jpeg') {
      return fallback
    }
    const bitmap = await loadBitmap(file)
    const width = (bitmap as ImageBitmap).width
    const height = (bitmap as ImageBitmap).height
    if (!width || !height) return fallback
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(width, height))
    const outW = Math.max(1, Math.round(width * scale))
    const outH = Math.max(1, Math.round(height * scale))
    const bytes = await encodeUnderTarget(bitmap as ImageBitmap, outW, outH)
    if (typeof (bitmap as ImageBitmap).close === 'function') {
      ;(bitmap as ImageBitmap).close()
    }
    const base = file.name.replace(/\.[^.]+$/, '') || 'receipt'
    return {
      bytes,
      mimeType: 'image/jpeg',
      fileName: `${base}.jpg`,
      sizeBytes: bytes.byteLength,
      downscaled: true,
    }
  } catch {
    return fallback
  }
}
