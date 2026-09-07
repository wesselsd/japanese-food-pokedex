import { afterEach, describe, expect, it, vi } from 'vitest'
import { compressImageToLimit } from '../utils/imageProcessing'

class TestImage {
  naturalWidth = 1000
  naturalHeight = 500

  addEventListener(event: string, callback: () => void) {
    if (event === 'load') queueMicrotask(callback)
  }

  set src(_value: string) {}
}

function stubImageCanvas(blobSize: number) {
  vi.stubGlobal('Image', TestImage)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
    if (tagName !== 'canvas') return document.createElementNS('http://www.w3.org/1999/xhtml', tagName)
    return {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback: BlobCallback) => callback(new Blob([new Uint8Array(blobSize)], { type: 'image/jpeg' }))
    } as unknown as HTMLCanvasElement
  }) as typeof document.createElement)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('image processing', () => {
  it('returns a JPEG at the configured size limit', async () => {
    stubImageCanvas(100 * 1024)

    const result = await compressImageToLimit(new Blob(['source']), 100 * 1024)

    expect(result.type).toBe('image/jpeg')
    expect(result.size).toBe(100 * 1024)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('fails clearly when the image cannot fit under the limit', async () => {
    stubImageCanvas(100 * 1024 + 1)

    await expect(compressImageToLimit(new Blob(['source']), 100 * 1024))
      .rejects.toThrow('This image could not be resized below 100KB.')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
