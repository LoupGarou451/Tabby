/** Crop rectangle in 0–1 fractions of the (EXIF-oriented) image. */
export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export type Rotation = 0 | 90 | 180 | 270

export const FULL_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 }

export class ImageDecodeError extends Error {}

/** Decodes a photo with its EXIF rotation applied. Throws ImageDecodeError if unsupported. */
export async function loadImage(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new ImageDecodeError("We couldn't read that image")
  }
}

/**
 * 2D context with high-quality resampling. The browser default ("low") blurred digits
 * enough for OCR to read a receipt's "27.35" as "21.35"; "high" reads it correctly.
 */
function smoothContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return ctx
}

/** Returns the image rotated by `rotation`, scaled so its long edge is at most `maxLong`. */
export function rotateImage(
  image: CanvasImageSource & { width: number; height: number },
  rotation: Rotation,
  maxLong = 3000,
): HTMLCanvasElement {
  const scale = Math.min(1, maxLong / Math.max(image.width, image.height))
  const w = Math.round(image.width * scale)
  const h = Math.round(image.height * scale)
  const sideways = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = sideways ? h : w
  canvas.height = sideways ? w : h
  const ctx = smoothContext(canvas)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(image, -w / 2, -h / 2, w, h)
  return canvas
}

/** Draws the cropped region scaled so its long edge is `long` px. */
function render(
  image: CanvasImageSource & { width: number; height: number },
  crop: Crop,
  long: number,
): HTMLCanvasElement {
  const sx = crop.x * image.width
  const sy = crop.y * image.height
  const sw = Math.max(1, crop.w * image.width)
  const sh = Math.max(1, crop.h * image.height)
  const scale = long / Math.max(sw, sh)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = smoothContext(canvas)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Prepares an (already rotated) image for OCR: crop and resize only, plus a small thumbnail
 * for review. Deliberately no thresholding or contrast tricks: in testing, Tesseract's own
 * binarization read receipts better than either (see the design doc's decision log).
 */
export function preprocess(
  image: CanvasImageSource & { width: number; height: number },
  crop: Crop = FULL_CROP,
): { canvas: HTMLCanvasElement; thumbnail: string } {
  const canvas = render(image, crop, 1600)
  const thumbnail = render(image, crop, 640).toDataURL('image/jpeg', 0.8)
  return { canvas, thumbnail }
}
