const DEFAULT_MAX_BYTES = 100 * 1024

export async function compressImageToLimit(source: Blob, maxBytes = DEFAULT_MAX_BYTES): Promise<File> {
  const sourceUrl = URL.createObjectURL(source)
  const image = new Image()
  image.src = sourceUrl

  try {
    await new Promise<void>((resolve, reject) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => reject(new Error('Unable to process the selected image.')), { once: true })
    })

    for (let maxDimension = 1600; maxDimension >= 320; maxDimension = Math.round(maxDimension * 0.8)) {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, maxDimension / image.naturalWidth)
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Unable to process the selected image.')
      context.drawImage(image, 0, 0, canvas.width, canvas.height)

      for (let quality = 0.85; quality >= 0.1; quality -= 0.05) {
        const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (compressed && compressed.size <= maxBytes) return new File([compressed], 'food-photo.jpg', { type: 'image/jpeg' })
      }
    }
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }

  throw new Error(`This image could not be resized below ${Math.round(maxBytes / 1024)}KB. Please choose a smaller image.`)
}
