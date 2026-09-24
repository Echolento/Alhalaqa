// lib/downscale-image.ts
// Client-only receipt prep: phone photos are 3-12MB, the cap is 5MB.
// Downscale to a 1600px JPEG client-side so uploads Just Work; anything the
// browser can't decode (e.g. HEIC on some browsers) falls back to the
// original bytes and the server validator gives the clear Arabic error.
// Canvas API => not unit-tested (jsdom has no canvas); keep it tiny.

export interface PreparedReceipt {
  bytes: Uint8Array
  mimeType: string
  fileName: string
  sizeBytes: number
  downscaled: boolean
}

const MAX_SIDE_PX = 1600
const JPEG_QUALITY = 0.85

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
      JPEG_QUALITY,
    )
  })
}

/** Downscale screenshots/photos so they fit the 5MB cap. Never throws. */
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
    // Already small enough and already JPEG — skip the work.
    if (file.size <= 5 * 1024 * 1024 && file.type === 'image/jpeg') {
      return fallback
    }
    const bitmap = await loadBitmap(file)
    const width = (bitmap as ImageBitmap).width
    const height = (bitmap as ImageBitmap).height
    if (!width || !height) return fallback
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(width, height))
    const outW = Math.max(1, Math.round(width * scale))
    const outH = Math.max(1, Math.round(height * scale))
    const bytes = await toJpegBytes(bitmap as ImageBitmap, outW, outH)
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
