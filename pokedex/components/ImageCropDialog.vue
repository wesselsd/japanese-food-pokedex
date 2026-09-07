<script setup lang="ts">
import { ref } from 'vue'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = defineProps<{ src: string }>()
const emit = defineEmits<{
  cancel: []
  crop: [file: File]
}>()

type CropperResult = {
  canvas?: HTMLCanvasElement | null
  coordinates: { left: number; top: number; width: number; height: number }
  image: { src: string | null }
}

const cropper = ref<{ getResult: () => CropperResult } | null>(null)
const latestCanvas = ref<HTMLCanvasElement | null>(null)
const cropReady = ref(false)

function updateCrop(result: { canvas?: HTMLCanvasElement }) {
  latestCanvas.value = result.canvas ?? null
}

function handleCropReady() {
  cropReady.value = true
}

async function createCanvasFromResult(result: CropperResult) {
  if (!result.coordinates.width || !result.coordinates.height) return null
  const image = new Image()
  image.src = result.image.src ?? props.src
  await new Promise<void>((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => reject(new Error('Unable to crop the selected image.')), { once: true })
  })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(result.coordinates.width)
  canvas.height = Math.round(result.coordinates.height)
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(
    image,
    result.coordinates.left,
    result.coordinates.top,
    result.coordinates.width,
    result.coordinates.height,
    0,
    0,
    canvas.width,
    canvas.height
  )
  return canvas
}

async function confirmCrop() {
  const result = cropper.value?.getResult()
  let canvas = latestCanvas.value ?? result?.canvas
  if (!canvas && result) {
    console.warn('Image cropper did not provide a canvas; using coordinate fallback.')
    try {
      canvas = await createCanvasFromResult(result)
    } catch (cause) {
      console.error('Unable to create a cropped image.', cause)
      return
    }
  }
  if (!canvas) {
    console.error('Unable to create a cropped image: the cropper returned no result canvas.')
  }
  if (!canvas) return
  canvas.toBlob((blob) => {
    if (blob) emit('crop', new File([blob], 'food-photo.jpg', { type: 'image/jpeg' }))
  }, 'image/jpeg', 0.92)
}
</script>

<template>
  <div class="detail-backdrop crop-backdrop" role="dialog" aria-modal="true" aria-label="Crop image" @click.self="emit('cancel')">
    <form class="crop-dialog" @submit.prevent="confirmCrop">
      <button type="button" class="detail-close" aria-label="Cancel crop" @click="emit('cancel')">×</button>
      <h2>Crop picture</h2>
      <p class="crop-help">Resize and drag the frame to choose a 16:9 part of the image.</p>
      <Cropper
        ref="cropper"
        class="cropper"
        :src="src"
        :stencil-props="{ aspectRatio: 16 / 9 }"
        :canvas="true"
        :check-orientation="true"
        :debounce="0"
        @change="updateCrop"
        @ready="handleCropReady"
      />
      <div class="crop-actions">
        <button type="button" class="text-button" @click="emit('cancel')">Cancel</button>
        <button class="auth-button" type="submit" :disabled="!cropReady">Use this crop</button>
      </div>
    </form>
  </div>
</template>
